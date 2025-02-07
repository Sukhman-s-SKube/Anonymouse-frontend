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


export const formSchema = z.object({
    msg: z.string().min(1),
});

export const Chatroom = ({ chatroom, userId, socket, setMsgNotifs, apiroot, newChatMembers }) => {
    const [messages, setMessages] = useState([]);
    const [chatMember, setChatMember] = useState("");
    const outMsgKeys = useRef({});

    const msgInputRef = useRef(null);
    const chatBottom = useRef(null);
    

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            msg: "",
        },
    });

    useEffect(() => {
        async function socketNewMsg() {
            socket.on('newMessage', await handleMsgIn);
        }
        if (socket != null && chatroom != null) {
            getMessages();
            socketNewMsg();
        }
    }, [socket, chatroom]);

    const readMsgReq = async (msgIds) => {
        let response;
        try {
            response = await axios.put(`${apiroot}/message/read`, {
                message_ids: msgIds
            }, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                }
            });
        } catch(err) {
            console.log(err);
            return toast.error("Msg In: Check console for error");
        }
    }

    const displayMsg = async (msg) => {
        let parsedMsg = await window.electron.getMsg(msg._id);

        if (msg.chatroom === chatroom._id) {
            setMessages((prevMsgs) => [...prevMsgs, parsedMsg]);
            setTimeout(() => {
                chatBottom.current.scrollIntoView({ behaviour: 'smooth' });
            }, 10);
            return;
        }
        setMsgNotifs((prevNotifs) => ({ ...prevNotifs, [msg.chatroom]: true}));
        return;
    };

    const parseMessage = async (msg) => {
        let myKey;
        try {
            myKey = await window.electron.getDHKey(parseInt(msg.message.privKeyId));
        } catch(err) {
            console.log(err);
            return toast.error("Msg In: Key not found. Check console for error");
        }

        let res = await decryptMsg(msg.message.content, msg.message.timestamp, msg.message.pubKey, myKey.privKey);
        if (res["error"] != "") {
            console.log(res["error"]);
            return toast.error("Msg In: Failed to decrypt msg. Check console for error");
        }
        msg.message.content = res["plainText"];
        await window.electron.insertMsg(msg);
    };

    const handleMsgIn = async (data) => {
        if (data.sender === userId) {
            let hash = await window.electron.sha256(data.message.content + data.message.pubKey + data.message.timestamp);
            if (outMsgKeys.current[hash]) {
                let res = await decryptMsg(data.message.content, data.message.timestamp, outMsgKeys.current[hash], "");
                if (res["error"] != "") {
                    console.log(res["error"]);
                    return toast.error("Msg In: Failed to decrypt msg. Check console for error");
                }
        
                delete outMsgKeys.current[hash];
                data.message.content = res["plainText"];
                await window.electron.insertMsg(data);
            }
        }
        else {
            await parseMessage(data);
        }
        
        await displayMsg(data);
        await readMsgReq([data._id]);
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
            chatBottom.current.scrollIntoView({ behaviour: 'smooth' });
        }, 10);

    };


    const sendMessage = async (values) => {
        let response;

        try {
            response = await axios.delete(`${apiroot}/user/dh_keys/${chatMember}`, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                }
        });
        } catch (err) {
            toast.error("Sending Msg: Failed to get other user's key. Check console for error");
            console.log(err);
            return
        }

        const otherPubDH = response.data.popped_key.pubKey;
        const otherPubDHId = response.data.popped_key.id; 
        const timestamp = new Date();
        
        let encData = await encryptMsg(otherPubDH, values.msg, timestamp.toJSON());
        if (encData["error"] != "") {
            toast.error("Sending Msg: Failed to encrypt message. Check console for error");
            console.log(encData["error"]);
            return
        }
    
        let payload = {
            "content": encData["cipherText"],
            "pubKey": encData["pubKey"],
            "privKeyId": otherPubDHId.toString(),
            "timestamp": timestamp.toJSON(),
        };
    
        let hash = await window.electron.sha256(payload.content + payload.pubKey + payload.timestamp);
        let val = {};
        val[`${hash}`] = encData["masterSec"];
        outMsgKeys.current = {...outMsgKeys.current, ...val};

        socket.emit("chatroomMessage", {
            "chatroomId": chatroom._id,
            "message": payload
        });

        form.reset();
        msgInputRef.current.focus();
    };

    const test = () => {
        console.log(chatroom);
    };

    return(
        <div className="chatroom">
            <h1 className="text-center text-4xl font-bold mb-10 text-green-600">Chatroom</h1>
            <div className="flex-1 overflow-y-scroll p-5 box-border">
                {messages == null || messages.length == 0 ? 'No chats to show' : messages.map((msg) => (
                    <Message content={msg.content} isSender={msg.sender == userId} key={msg.mongoId}/>
                ))}
                <div ref={chatBottom}/>
            </div>
            {chatroom == null && newChatMembers?.length == 0 ? '' : 
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(sendMessage)} className="flex p-5 bg-white border-solid border-t border-gray-300">
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
                        <Button type="submit" className="text-base">Send</Button>
                        {/* <Button onClick={test}>Test</Button> */}
                    </form>
                </Form>
            }
        </div>
    );
};