import { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import axios from 'axios';

import '@/Components/Chatroom/Chatroom.css';
import { encryptMsg, decryptMsg } from '@/Logic/WasmFunctions';

import { Button } from '@/Components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';
import { Message } from '@/Components/Message/Message';

export const formSchema = z.object({
  msg: z.string().min(1),
});

const Spinner = () => (
  <div className="flex items-center justify-center py-4">
    <svg
      className="animate-spin h-6 w-6 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  </div>
);

export const Chatroom = ({ chatroom, userId, socket, setMsgNotifs, apiroot, newChatMembers, chatrooms = [] }) => {
  const [messages, setMessages] = useState([]);
  const [chatMember, setChatMember] = useState("");
  const outMsgKeys = useRef({});

  const msgInputRef = useRef(null);
  const chatBottom = useRef(null);

  const [loadingMessages, setLoadingMessages] = useState(true);

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
          chatBottom.current.scrollIntoView({ behavior: "smooth" });
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
    setLoadingMessages(true);
    if (chatroom == null) {
      setMessages([]);
      setLoadingMessages(false);
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
    setLoadingMessages(false);
    setTimeout(() => {
      if (chatBottom.current) {
        chatBottom.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 10);
  };

  const sendMessage = async (values) => {
    const timestamp = new Date().toISOString();
    const provisionalId = "pending_" + new Date().getTime();
    
    const pendingMessage = {
      _id: provisionalId,
      provisionalId: provisionalId,
      content: values.msg.trim(),
      sender: userId,
      pending: true,
      provisional: true,
      timestamp,
      chatroom: chatroom._id,
    };
    
    setMessages((prevMessages) => [...prevMessages, pendingMessage]);
    form.reset();
    msgInputRef.current?.focus();
    
    let response;
    try {
      response = await axios.delete(`${apiroot}/user/dh_keys/${chatMember}`, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
    } catch (err) {
      toast.error("Sending Msg: Failed to get other user's key. Message remains pending.");
      console.error(err);
      return;
    }
    const otherPubDH = response.data.popped_key.pubKey;
    const otherPubDHId = response.data.popped_key.id;
    
    let encData = await encryptMsg(otherPubDH, values.msg.trim(), timestamp);
    if (encData["error"] !== "") {
      toast.error("Sending Msg: Failed to encrypt message. Message remains pending.");
      console.log(encData["error"]);
      return;
    }
    
    let payload = {
      content: encData["cipherText"],
      pubKey: encData["pubKey"],
      privKeyId: otherPubDHId.toString(),
      timestamp,
      provisionalId, 
    };
    
    const properHash = await window.electron.sha256(
      payload.content + payload.pubKey + payload.timestamp
    );
    outMsgKeys.current = { ...outMsgKeys.current, [properHash]: encData["masterSec"] };
    
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === provisionalId ? { ...msg, hash: properHash, pending: false, provisional: false } : msg
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
        {loadingMessages ? (
          <Spinner />
        ) : messages == null || messages.length === 0 ? (
          'No chats to show'
        ) : (
          messages.map((msg) => (
            <Message
              content={msg.content}
              isSender={msg.sender === userId}
              key={msg.mongoId || msg._id}
              pending={msg.pending}
            />
          ))
        )}
        <div ref={chatBottom} />
      </div>
      {chatroom && (
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
      )}
    </div>
  );
};
