import { useEffect, useState } from "react";
import { Link } from "react-router";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from 'sonner';

import { generateDHKeys } from "@/Logic/WasmFunctions";
import { getChatroomsRequest } from "@/Logic/HomePageHelper";

import { Chatroom } from "@/Components/Chatroom/Chatroom"
import { Sidebar } from "@/Components/Sidebar/Sidebar"
import { Button } from "@/Components/ui/button";
import { NewChat } from "@/Components/Sidebar/NewChat";

export const HomePage = ({ loggedIn, username, userId, apiroot }) => {
    const [socket, setSocket] = useState();
    const [chatrooms, setChatrooms] = useState([]);
    const [currChatroom, setCurrChatroom] = useState();
    const [msgNotifs, setMsgNotifs] = useState({});
    const [addNewChatToggle, setAddNewChatToggle] = useState(false);
    const [newChatMembers, setNewChatMembers] = useState([]);

    useEffect(() => {
        async function setupSocket() {
            let tempSoc = await io("https://se4450.duckdns.org/", {
                    extraHeaders: {
                        Authorization: sessionStorage.getItem("JWT"),
                    }
                });
            setSocket(tempSoc);
        }
        if (loggedIn) {
            setupSocket()
        }
    }, [loggedIn]);

    useEffect(() => {
        if (socket != null) {
            socket.on('connect', async () => {
                let numKeys = 100
                const genDHKeys = await generateDHKeys(numKeys);
                const parsedKeys = JSON.parse(genDHKeys);
                if (parsedKeys.err != '') {
                    console.log(parsedKeys.err);
                    return toast.error('Gen Keys: Error generating DH Keys. Check console for error');
                }

                await window.electron.insertDHKeys(parsedKeys.keys);
                let keys = await window.electron.getKeys(numKeys);
                
                await sendDHKeysRequest(keys)
                await getChatroomsRequest(socket, setChatrooms, apiroot)
            });
        }
    }, [socket]);

    const sendDHKeysRequest = async (keys) => {
        let response;
        try {
            response = await axios.put(`${apiroot}/user/dh_keys`, keys, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                },
            });
        } catch(newChatMemberserr) {
            console.log(err);
            return toast.error("Gen Keys: Failed to send keys to server. Check console for error");
        }
    };

    // const getChatroomsRequest = async (soc) => {
    //     let response;
    //     try {
    //         response = await axios.get(`${apiroot}/chatroom`, {
    //             headers: {
    //                 Authorization: sessionStorage.getItem("JWT"),
    //             },
    //         });
    //     } catch(err) {
    //         toast.error("Error getting chatrooms. Check Console");
    //         console.log(err);
    //         return;
    //     }

    //     setChatrooms(response.data);
    //     for (let room of response.data) {
    //         soc.emit("joinRoom", { "chatroomId": room._id });
    //     }
    // }

    const logout = () => {
        socket.disconnect();
    }

    const test = () => {
        console.log(addNewChat);
    }

    return(
        <div className="flex flex-row h-screen bg-slate-50 text-neutral-800 relative overflow-hidden">
            <NewChat isOpen={addNewChatToggle} toggle={setAddNewChatToggle} apiroot={apiroot} setNewChatMembers={setNewChatMembers}/>
            <Sidebar username={username} chatrooms={chatrooms} setCurrChatroom={setCurrChatroom} msgNotifs={msgNotifs} setAddNewChat={setAddNewChatToggle}/>
            <Chatroom chatroom={currChatroom} userId={userId} socket={socket} setMsgNotifs={setMsgNotifs} apiroot={apiroot}/>
            {/* <Button onClick={test}></Button> */}
            <Button className="fixed top-[10px] right-[10px] py-[1px] px-[10px] bg-red-600 hover:bg-red-700" onClick={logout}><Link to="/">Log out</Link></Button>
        </div>
    )
};