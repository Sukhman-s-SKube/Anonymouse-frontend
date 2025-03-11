import { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import axios from 'axios';

import '@/Components/Chatroom/Chatroom.css';
import { encryptMsg, decryptMsg, x3DHSender } from '@/Logic/WasmFunctions';

import { Button } from '@/Components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';
import { Message } from '@/Components/Message/Message';

export const formSchema = z.object({
  msg: z.string().min(1),
});

export const Chatroom = ({ chatroom, userId, socket, setMsgNotifs, apiroot, newChatMembers, chatrooms = [] }) => {
  const [messages, setMessages] = useState([]);
  const [chatMember, setChatMember] = useState("");
  const outMsgKeys = useRef({});

  const msgInputRef = useRef(null);
  const chatBottom = useRef(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { msg: "" },
  });
  
  useEffect(() => {
    setMessages([]);
  }, [chatroom]);

  useEffect(() => {
    if (socket != null && chatroom != null) {
      getMessages();
      socket.on('newMessage', handleMsgIn);
      return () => socket.off('newMessage', handleMsgIn);
    }
  }, [socket, chatroom]);

  useEffect(() => {
    if (!socket || !chatroom) return;
    const handleReconnect = () => {
      console.log("Socket reconnected – refreshing messages");
      getMessages();
    };
    socket.on("reconnect", handleReconnect);
    return () => {
      socket.off("reconnect", handleReconnect);
    };
  }, [socket, chatroom]);

  useEffect(() => {
    if (!apiroot) return;
    const pendingMessages = messages.filter((msg) => msg.pending === true);
    pendingMessages.forEach((msg) => {
      resendPendingMessage(msg);
    });
  }, [apiroot]);

  const readMsgReq = async (msgIds) => {
    try {
      await axios.put(`${apiroot}/message/read`, { message_ids: msgIds }, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
    } catch (err) {
      console.log(err);
      toast.error("Msg In: Check console for error");
    }
  };

  const displayMsg = async (msg) => {
    let parsedMsg = await window.electron.getMsg(msg._id);
    if (msg.chatroom === chatroom._id) {
      setMessages((prevMsgs) => [...prevMsgs, parsedMsg]);
      setTimeout(() => {
        if (chatBottom.current) {
          chatBottom.current.scrollIntoView({ behaviour: 'smooth' });
        }
      }, 10);
      return;
    }
    setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [msg.chatroom]: true }));
    return;
  };

  const parseMessage = async (msg) => {
    let myKey;
    try {
      myKey = await window.electron.getDHKey(parseInt(msg.message.privKeyId));
    } catch (err) {
      console.log(err);
      toast.error("Msg In: Key not found. Check console for error");
      return;
    }
    let res = await decryptMsg(
      msg.message.content,
      msg.message.timestamp,
      msg.message.pubKey,
      myKey.privKey
    );
    if (res["error"] != "") {
      console.log(res["error"]);
      toast.error("Msg In: Failed to decrypt msg. Check console for error");
      return;
    }
    msg.message.content = res["plainText"];
    await window.electron.insertMsg(msg);
  };

  const resendPendingMessage = async (pendingMsg) => {
    const timestamp = new Date(pendingMsg.timestamp);
    try {
      const response = await axios.delete(`${apiroot}/user/dh_keys/${chatMember}`, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
      const otherPubDH = response.data.popped_key.pubKey;
      const otherPubDHId = response.data.popped_key.id;
      
      let encData = await encryptMsg(otherPubDH, pendingMsg.content, timestamp.toISOString());
      if (encData["error"] !== "") {
        console.log(encData["error"]);
        return toast.error("Resend Msg: Failed to encrypt message.");
      }
      
      let payload = {
        content: encData["cipherText"],
        pubKey: encData["pubKey"],
        privKeyId: otherPubDHId.toString(),
        timestamp: timestamp.toISOString(),
      };
      const properHash = await window.electron.sha256(
        payload.content + payload.pubKey + payload.timestamp
      );
      
      outMsgKeys.current = { ...outMsgKeys.current, [properHash]: encData["masterSec"] };
  
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === pendingMsg._id ? { ...msg, hash: properHash, pending: false } : msg
        )
      );
      
      socket.emit("chatroomMessage", {
        chatroomId: chatroom._id,
        message: payload,
      });
    } catch (err) {
      console.error("Resend failed", err);
    }
  };

  const addMessage = async (data) => {
    await window.electron.insertMsg(data);
    let confirmedMsg = await window.electron.getMsg(data._id);
    
    if (data.chatroom === chatroom._id) {
      setMessages((prevMsgs) => {
        const pendingIndex = prevMsgs.findIndex(
          (msg) =>
            msg.pending === true &&
            new Date(msg.timestamp).getTime() === new Date(data.message.timestamp).getTime()
        );
        if (pendingIndex !== -1) {
          const newMsgs = [...prevMsgs];
          newMsgs[pendingIndex] = { ...confirmedMsg, pending: false, provisional: false };
          return newMsgs;
        } else {
          const exists = prevMsgs.some((msg) => msg._id === confirmedMsg._id);
          if (exists) {
            return prevMsgs.map((msg) => (msg._id === confirmedMsg._id ? confirmedMsg : msg));
          }
          return [...prevMsgs, confirmedMsg];
        }
      });
      setTimeout(() => {
        if (chatBottom.current) {
          chatBottom.current.scrollIntoView({ behaviour: "smooth" });
        }
      }, 10);
      return;
    }
    setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [data.chatroom]: true }));
    return;
  };

  const handleMsgIn = async (data) => {
    if (data.sender === userId) {
      let hash = await window.electron.sha256(
        data.message.content + data.message.pubKey + data.message.timestamp
      );
      if (outMsgKeys.current[hash]) {
        let res = await decryptMsg(
          data.message.content,
          data.message.timestamp,
          outMsgKeys.current[hash],
          ""
        );
        if (res["error"] !== "") {
          console.log(res["error"]);
          return toast.error("Msg In: Failed to decrypt msg. Check console for error");
        }
        delete outMsgKeys.current[hash];
        data.message.hash = hash;
        data.message.content = res["plainText"];
        await addMessage(data);
      }
      await readMsgReq([data._id]);
      return;
    } else {
      let myKey = await window.electron.getDHKey(parseInt(data.message.privKeyId));
      let res = await decryptMsg(
        data.message.content,
        data.message.timestamp,
        data.message.pubKey,
        myKey.privKey
      );
      if (res["error"] !== "") {
        console.log(res["error"]);
        return toast.error("Msg In: Failed to decrypt msg. Check console for error");
      }
      data.message.content = res["plainText"];
      if (data.chatroom !== chatroom._id) {
        setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [data.chatroom]: true }));
        return;
      }
      await addMessage(data);
    }
  };

  const getMessages = async () => {
    if (chatroom == null) {
      setMessages([]);
      return;
    }
    for (let mem of chatroom.members) {
      if (mem !== userId) {
        setChatMember(mem);
        break;
      }
    }

    let response;
    try {
      response = await axios.get(`${apiroot}/message/${chatroom._id}`, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
    } catch (err) {
      toast.error("Error getting messages. Check Console");
      console.log(err);
    }

    let msgIds = [];
    if (response.data.length > 0) {
      for (let i = 0; i < response.data.length; i++) {
        try {
          await parseMessage(response.data[i]);
          msgIds.push(response.data[i]._id);
        } catch {}
      }
      await readMsgReq(msgIds);
    }

    let finalChat = await window.electron.getMsgs(chatroom._id);
    setMessages(finalChat);
    setTimeout(() => {
      if (chatBottom.current) {
        chatBottom.current.scrollIntoView({ behaviour: 'smooth' });
      }
    }, 10);
  };

  const sendMessage = async (values) => {
    const timestamp = new Date().toISOString();
    const provisionalId = "pending_" + new Date().getTime();
    
    const pendingMessage = {
      _id: provisionalId,
      content: values.msg.trim(),
      sender: userId,
      pending: true,
      provisional: true,
      timestamp,
      chatroom: chatroom._id,
    };
    
    setMessages((prevMessages) => [...prevMessages, pendingMessage]);
    form.reset();
    if (msgInputRef.current) msgInputRef.current.focus();

    if (!(await window.electron.chatroomExists(chatroom._id, userId))) {
      let response;
      try {
        response = await axios.get(`${apiroot}/chatroom/${chatMember}/send`, {
          headers: { Authorization: sessionStorage.getItem("JWT") },
        });
      } catch(err) {
        toast.error("Sending Msg: Failed to get other user's package. Message remains pending.");
        console.error(err);
        return;
      }

      let ik = await window.electron.getIdentityKey(userId);
      let x3dh = await x3DHSender(
                response.data.identityKey,
                response.data.schnorrKey,
                response.data.schnorrSig,
                response.data.otpKey.public,
                ik,
                values.msg,
                timestamp
              );
      x3dh = JSON.parse(x3dh);
      if (x3dh.err != '') {
        toast.error("Sending Msg: Failed to send message. Message remains pending.");
        console.error(err);
        return;
      }

      console.log(x3dh);
      await window.electron.insertChatroom({_id: chatroom._id, name: chatroom.name, rk: x3dh.rK}, userId);
      await window.electron.updateChatroom({sck: x3dh.sCK, privDH: x3dh.dhK.privKey}, chatroom._id, userId);

    }
    
    // Payload keys need to be verified with Sukhman/backend
    let payload = {
      content: x3dh.cipherText,
      sender: userId,
      chatroom: chatroom._id,
      eK: x3dh.eK.pubKey,
      otpId: response.data.otpKey.id,
      dhKey: x3dh.dhK.pubKey,
      timestamp,
    };
    
    const properHash = await window.electron.sha256(payload.content + payload.timestamp + payload.chatroom);
    outMsgKeys.current = { ...outMsgKeys.current, [properHash]: x3dh.mK };
    
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === provisionalId ? { ...msg, hash: properHash } : msg
      )
    );
    
    socket.emit("chatroomMessage", {
      chatroomId: chatroom._id,
      message: payload,
    });
  };

  return (
    <div className="chatroom">
      <h1 className="text-center text-4xl font-bold mb-10 text-green-600">Chatroom</h1>
      <div className="flex-1 overflow-y-scroll p-5 box-border">
        {messages == null || messages.length == 0
          ? 'No chats to show'
          : messages.map((msg) => (
              <Message
                content={msg.content}
                isSender={msg.sender == userId}
                key={msg.mongoId || msg._id}
                pending={msg.pending}
              />
            ))}
        <div ref={chatBottom} />
      </div>
      {chatroom == null && newChatMembers?.length == 0 ? '' : 
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(sendMessage)}
            className="flex p-5 bg-[#f9f9f9] dark:bg-[#262626] border-solid border-t border-gray-300 dark:border-gray-700"
          >
            <FormField
              control={form.control}
              name="msg"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input {...field} className="flex-1 text-base" ref={msgInputRef} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="text-base bg-[#f9f9f9] dark:bg-[#262626] border border-gray-300 dark:border-gray-700 text-black dark:text-white"
            >
              Send
            </Button>
          </form>
        </Form>
      }
    </div>
  );
};
