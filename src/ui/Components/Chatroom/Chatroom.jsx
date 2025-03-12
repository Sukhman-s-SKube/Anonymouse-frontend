import { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import axios from 'axios';

import '@/Components/Chatroom/Chatroom.css';
import { x3DHSender, x3DHReceiver, senderFirst, sender, receiverFirst, receiver } from '@/Logic/WasmFunctions';

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
      className="animate-spin h-6 w-6 text-gray-800 dark:text-white"
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
  const chatMember = useRef("");
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

  const initMsgReceive = async (msg) => {
      let senderInfoRes;
      try {
        senderInfoRes = await axios.get(`${apiroot}/chatroom/${chatMember.current}/receive`, {
          headers: { Authorization: sessionStorage.getItem("JWT") },
        });
      } catch(err) {
        throw new Error(err);
      }

      let ik = await window.electron.getIdentityKey(userId);
      let sk = await window.electron.getSchnorrKey(userId);
      let otpKey = await window.electron.getDHKey(msg.message.otpID, userId);
      let x3dh = await x3DHReceiver(
        senderInfoRes.data.identityKey,
        senderInfoRes.data.schnorrKey,
        senderInfoRes.data.schnorrSig,
        msg.message.ephKey,
        ik,
        sk,
        otpKey.private,
        msg.message.content,
        msg.message.timestamp
      );
      x3dh = JSON.parse(x3dh);
      if (x3dh.err !== "") {
        throw new Error(x3dh.err);
      }

      await window.electron.insertChatroom({_id: chatroom._id, name: chatroom.name, rk: x3dh.rK}, userId);
      await window.electron.updateChatroom({rck: x3dh.rCK, otherPubDH: msg.message.DHKey}, chatroom._id, userId);
      
      msg.message.content = x3dh.plainText;
      await window.electron.insertMsg(msg, userId);
  }

  const parseMessage = async (msg) => {
    let dbChatroom = await window.electron.getChatroom(chatroom._id, userId);
    if (!dbChatroom.other_pub_dh) {
      let initReceiveChain = await receiverFirst(
        msg.message.DHKey,
        dbChatroom.self_priv_dh,
        dbChatroom.root_key,
        msg.message.content,
        msg.message.timestamp
      );
      initReceiveChain = JSON.parse(initReceiveChain);
      if (initReceiveChain.err !== "") {
        throw new Error(initReceiveChain.err);
      }
      await window.electron.updateChatroom({rck: initReceiveChain.rCK, otherPubDH: msg.message.DHKey, rk: initReceiveChain.rK}, chatroom._id, userId);
      msg.message.content = initReceiveChain.plainText;
    }
    else {
      let conReceiveChain = await receiver(dbChatroom.receive_chain_key, msg.message.content, msg.message.timestamp);
      conReceiveChain = JSON.parse(conReceiveChain);
      if (conReceiveChain.err !== "") {
        throw new Error(conReceiveChain.err);
      }
      await window.electron.updateChatroom({rck: conReceiveChain.rCK, otherPubDH: msg.message.DHKey}, chatroom._id, userId);
      msg.message.content = conReceiveChain.plainText;
    }
    await window.electron.insertMsg(msg, userId);
  };

  const addMessage = async (data) => {
    let confirmedMsg = await window.electron.getMsg(data._id, userId);
    if (!confirmedMsg) {
      await window.electron.insertMsg(data, userId);
      confirmedMsg = await window.electron.getMsg(data._id, userId);
    }
    
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
        data.message.content + data.message.timestamp + data.chatroom
      );
      if (outMsgKeys.current[hash]) {
        let res = await mKDecrypt(outMsgKeys.current[hash], data.message.content);
        res = JSON.parse(res);
        if (res.err !== "") {
          console.log(res.err);
          return toast.error("Msg In: Failed to send Message. Check console for error");
        }
        delete outMsgKeys.current[hash];
        data.message.hash = hash;
        data.message.content = res.plainText;
        await addMessage(data);
      }
      await readMsgReq([data._id]);
      return;
    }
    else {
      if (data.chatroom === chatroom._id) {
        try {
          await parseMessage(data);
        } catch(err) {
          console.error(err);
          return toast.error("Getting Msg: Failed to load message.");
        }
      }
      else {
        setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [data.chatroom]: true }));
        return;
      }
      await addMessage(data);
      await readMsgReq([data._id]);
      return
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
        chatMember.current = mem;
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
    if (response.data.length > 0 && !(await window.electron.chatroomExists(chatroom._id, userId))) {
      let firstMsg = response.data.shift();
      try {
        await initMsgReceive(firstMsg);
      } catch(err) {
        console.error(err);
        return toast.error("Getting Msg: Failed to load message.");
      }
      msgIds.push(firstMsg._id);
    } 

    if (response.data.length > 0) {
      for (let i = 0; i < response.data.length; i++) {
        try {
          await parseMessage(response.data[i]);
          msgIds.push(response.data[i]._id);
        } catch(err) {
          console.error(err);
          return toast.error("Getting Msg: Failed to load message.");
        }
      }
    }
    if (msgIds.length > 0) {
      await readMsgReq(msgIds);
    }

    let finalChat = await window.electron.getMsgs(chatroom._id, userId);
    setMessages(finalChat);
    setLoadingMessages(false);
    setTimeout(() => {
      if (chatBottom.current) {
        chatBottom.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 10);
  };

  const initMsgSend = async (timestamp, values) => {
    let x3dh;
    let response;

    try {
      response = await axios.get(`${apiroot}/chatroom/${chatMember.current}/send`, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
    } catch(err) {
      throw new Error(err);
    }

    let ik = await window.electron.getIdentityKey(userId);
    x3dh = await x3DHSender(
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
      throw new Error(x3dh.err);
    }
    
    return {
      payload: {
        content: x3dh.cipherText,
        ephKey: x3dh.eK,
        otpID: response.data.otpKey.id,
        DHKey: x3dh.dhK.pubKey,
        timestamp,
      },
      mK: x3dh.mK,
      rK: x3dh.rK,
      sCK: x3dh.sCK,
      dhK: x3dh.dhK.privKey,
    };
  }

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
    if (msgInputRef.current) msgInputRef.current.focus();

    let payload;
    if (!(await window.electron.chatroomExists(chatroom._id, userId))) {
      try {
        payload = await initMsgSend(timestamp, values);
      } catch (err) {
        console.error(err);
        return toast.error("Sending Msg: Failed to send message. Message remains pending.");
      }
    }
    else {
      let dbChatroom = await window.electron.getChatroom(chatroom._id, userId);
      if (dbChatroom.other_pub_dh) {
        let initSendChain = await senderFirst(dbChatroom.other_pub_dh, dbChatroom.root_key, values.msg, timestamp);
        initSendChain = JSON.parse(initSendChain);
        if (initSendChain.err !== "") {
          console.error(initSendChain.err);
          return toast.error("Sending Msg: Failed to send message. Message remains pending.");
        }
        await window.electron.updateChatroom({
          sck: initSendChain.sCK,
          rk: initSendChain.rK,
          privDH: initSendChain.dhK.privKey,
          selfPubDH: initSendChain.dhK.pubKey,
          otherPubDH: "."}, chatroom._id, userId);
        payload = {
          payload: {
            content: initSendChain.cipherText,
            DHKey: initSendChain.dhK.pubKey,
            timestamp,
          },
          mK: initSendChain.mK
        }
      }
      else {
        let conSendChain = await sender(dbChatroom.send_chain_key, values.msg, timestamp);
        conSendChain = JSON.parse(conSendChain);
        if (conSendChain.err !== "") {
          console.error(conSendChain.err);
          return toast.error("Sending Msg: Failed to send message. Message remains pending.");
        }
        await window.electron.updateChatroom({sck: conSendChain.sCK}, chatroom._id, userId);
        payload = {
          payload: {
            content: conSendChain.cipherText,
            DHKey: dbChatroom.self_pub_dh,
            timestamp,
          },
          mK: conSendChain.mK
        }
      }
    }
    
    const properHash = await window.electron.sha256(payload.payload.content + payload.payload.timestamp + chatroom._id);
    outMsgKeys.current = { ...outMsgKeys.current, [properHash]: payload.mK };

    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === provisionalId ? { ...msg, hash: properHash, pending: false, provisional: false } : msg
      )
    );
    
    socket.emit("chatroomMessage", {
      chatroomId: chatroom._id,
      message: payload.payload,
    });

    if (!(await window.electron.chatroomExists(chatroom._id, userId))) {
      await window.electron.insertChatroom({_id: chatroom._id, name: chatroom.name, rk: payload.rK}, userId);
      await window.electron.updateChatroom({sck: payload.sCK, privDH: payload.dhK, selfPubDH: payload.payload.DHKey}, chatroom._id, userId);
    }
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
      {chatroom == null ? '' : 
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
