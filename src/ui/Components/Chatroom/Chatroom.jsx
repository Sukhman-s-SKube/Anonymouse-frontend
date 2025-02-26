import { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import axios from 'axios';

import '@/Components/Chatroom/Chatroom.css'
import { encryptMsg, decryptMsg } from '@/Logic/WasmFunctions';

import { Button } from '@/Components/ui/button';
import { 
    Form,
    FormControl,
    FormField,
    FormItem
} from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';
import { Message } from '@/Components/Message/Message';
import ConfirmModal from './ConfirmModal';

export const formSchema = z.object({
    msg: z.string().min(1),
});

export const Chatroom = ({ chatroom, userId, socket, setMsgNotifs, apiroot, newChatMembers, chatrooms = [], onDeleteChatroom  }) => {
    const [messages, setMessages] = useState([]);
    const [chatMember, setChatMember] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const outMsgKeys = useRef({});

    const msgInputRef = useRef(null);
    const chatBottom = useRef(null);
    

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            msg: "",
        },
    });

    const handleDeleteClick = () => {
      setShowDeleteModal(true);
    };
  
    const confirmDelete = () => {
      setShowDeleteModal(false);
      onDeleteChatroom(chatroom._id);
    };
  
    const cancelDelete = () => {
      setShowDeleteModal(false);
    };

    useEffect(() => {
        async function socketNewMsg() {
            socket.on('newMessage', await handleMsgIn);
        }
        if (socket != null && chatroom != null) {
            getMessages();
            socketNewMsg();
            console.log(chatroom);
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
          // Optionally, you could leave the message as pending and try again later.
        }
      };
      
      
    
      const addMessage = async (data) => {
        await window.electron.insertMsg(data);
        let confirmedMsg = await window.electron.getMsg(data._id);
      
        if (data.chatroom === chatroom._id) {
          setMessages((prevMsgs) => {
            // Match by timestamp since that should be unique and unchanged.
            const index = prevMsgs.findIndex(
              (msg) =>
                msg.pending === true &&
                msg.timestamp === data.message.timestamp // assume this matches the original timestamp
            );
            if (index !== -1) {
              // Replace the pending message with the confirmed one.
              const newMsgs = [...prevMsgs];
              newMsgs[index] = { ...confirmedMsg, pending: false, provisional: false };
              return newMsgs;
            } else {
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
          // For messages sent by the current user.
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
            if (res["error"] != "") {
              console.log(res["error"]);
              return toast.error("Msg In: Failed to decrypt msg. Check console for error");
            }
            delete outMsgKeys.current[hash];
            data.message.hash = hash;
            data.message.content = res["plainText"];
            await addMessage(data);
          }
          return;
        }
      
        let myKey = await electron.getDHKey(parseInt(data.message.privKeyId));
        let res = await decryptMsg(
          data.message.content,
          data.message.timestamp,
          data.message.pubKey,
          myKey.privKey
        );
        if (res["error"] != "") {
          console.log(res["error"]);
          return toast.error("Msg In: Failed to decrypt msg. Check console for error");
        }
        data.message.content = res["plainText"];
        if (data.chatroom != chatroom._id) {
          setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [data.chatroom]: true }));
          return;
        }
        await addMessage(data);
      };
    

    const getMessages = async () => {
        if (chatroom == null) {
            setMessages([]);
            return;
        }

        for (let mem of chatroom.members) {
            if (mem != userId) {
                setChatMember(mem);
                break;
            }
        }

        let response
        try {
            response = await axios.get(`${apiroot}/message/${chatroom._id}`, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                }   
            });
        } catch(err) {
            toast.error("Error getting messages. Check Console");
            console.log(err);
            setMessages([]);
            return;
        }

        const currentChat = response.data;
        let storedChat = await window.electron.getMsgs(chatroom._id);

        if (currentChat.length > storedChat.length) {
            for (let i = storedChat.length; i < currentChat.length; i++) {
              let myKey = await window.electron.getDHKey(parseInt(currentChat[i].message.privKeyId));
    
              let res = await decryptMsg(currentChat[i].message.content, currentChat[i].message.timestamp, currentChat[i].message.pubKey, myKey.privKey);
              if (res["error"] != "") {
                console.log(res["error"]);
                return toast.error("Msg In: Failed to decrypt msg. Check console for error");
              }
              currentChat[i].message.content = res["plainText"];
              await window.electron.insertMsg(currentChat[i]);
              currentChat[i] = {};
            }
          }

        let finalChat = await window.electron.getMsgs(chatroom._id);
        setMessages(finalChat);
        setTimeout(() => {
            chatBottom.current.scrollIntoView({ behaviour: 'smooth' });
        }, 10);

    };


    const sendMessage = async (values) => {
        const timestamp = new Date().toISOString(); // unique timestamp string
        const provisionalId = "pending_" + new Date().getTime();
        
        // Create a pending message with a provisional flag and the timestamp.
        const pendingMessage = {
          _id: provisionalId,
          content: values.msg.trim(),
          sender: userId,
          pending: true,
          provisional: true, // flag to mark as pending
          timestamp,         // unique identifier
          chatroom: chatroom._id,
        };
      
        // Immediately add the pending message.
        setMessages((prevMessages) => [...prevMessages, pendingMessage]);
        
        // Clear the input form immediately.
        form.reset();
        if (msgInputRef.current) msgInputRef.current.focus();
      
        // Continue with retrieving the other user's key, encryption, etc.
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
        };
      
        // Compute the proper hash if needed (or you can use the timestamp as your unique identifier)
        const properHash = await window.electron.sha256(
          payload.content + payload.pubKey + payload.timestamp
        );
        outMsgKeys.current = { ...outMsgKeys.current, [properHash]: encData["masterSec"] };
      
        // Update the pending message in state to include the proper hash.
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === provisionalId ? { ...msg, hash: properHash } : msg
          )
        );
      
        // Emit the message via socket.
        socket.emit("chatroomMessage", {
          chatroomId: chatroom._id,
          message: payload,
        });
      };
      

    return(
        <div className="chatroom">
            <h1 className="text-center text-4xl font-bold mb-10 text-green-600">Chatroom</h1>

              {chatroom && (
                <div className="text-center mb-4">
                  <Button variant="destructive" onClick={handleDeleteClick}>
                    Delete Chatroom
                  </Button>
                </div>
              )}

              {showDeleteModal && (
                <ConfirmModal
                  message="Are you sure you want to delete this chatroom? This will delete all messages for everyone."
                  onConfirm={confirmDelete}
                  onCancel={cancelDelete}
                />
              )}
            <div className="flex-1 overflow-y-scroll p-5 box-border">
                {messages == null || messages.length == 0 ? 'No chats to show' : messages.map((msg) => (
                    <Message content={msg.content} isSender={msg.sender == userId} key={msg.mongoId} pending={msg.pending}/>
                ))}
                <div ref={chatBottom}/>
            </div>
            {chatroom == null && newChatMembers?.length == 0 ? '' : 
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(sendMessage)} 
                    className="flex p-5 bg-[#f9f9f9] dark:bg-[#262626] border-solid border-t border-gray-300 dark:border-gray-700">
                        <FormField
                            control={form.control}
                            name="msg"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input {...field} className="flex-1 text-base" ref={msgInputRef}/>
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