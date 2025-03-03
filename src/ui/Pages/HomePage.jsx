import { useEffect, useState } from "react";
import { Link } from "react-router";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from 'sonner';

import { generateDHKeys } from "@/Logic/WasmFunctions";

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
    const [newChatCreated, setNewChatCreated] = useState(false);

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
                await getChatroomsRequest(socket)

                socket.on("newChatroom", (chatroomData) => {
                    console.log(chatroomData)
                    setChatrooms((prevChatrooms) => [...prevChatrooms, chatroomData]);
                    //setNewChatCreated(true); uncomment this incase of sidebar not updating correctly
    
                    socket.emit("joinRoom", { chatroomId: chatroomData._id });
    
                    toast.info(`New chatroom created with ${chatroomData.name}`);
                });

                socket.on("deletedChatroom", (chatroomId) => {
                    setChatrooms((prevChatrooms) => 
                        prevChatrooms.filter(chatroom => chatroom._id !== chatroomId["message"])
                    );
    
                    setCurrChatroom((prev) => (prev?._id === chatroomId["message"] ? null : prev));
                });
            });
            
            return () => {
                socket.off("newChatroom");
                socket.off("deletedChatroom");
            };
        }
    }, [socket]);

    useEffect(() => {
        async function refreshSideBar() {
            if (newChatCreated) {
                await getChatroomsRequest(socket);
                setNewChatCreated(false);
            }
        };
        refreshSideBar();
    }, [newChatCreated]);

    const sendDHKeysRequest = async (keys) => {
        let response;
        try {
            response = await axios.put(`${apiroot}/user/dh_keys`, keys, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                },
            });
        } catch(err) {
            console.log(err);
            return toast.error("Gen Keys: Failed to send keys to server. Check console for error");
        }
    };

    const getChatroomsRequest = async (soc) => {
        let response;
        try {
            response = await axios.get(`${apiroot}/chatroom`, {
                headers: {
                    Authorization: sessionStorage.getItem("JWT"),
                },
            });
        } catch(err) {
            toast.error("Error getting chatrooms. Check Console");
            console.log(err);
            return;
        }

        setChatrooms(response.data);
        for (let room of response.data) {
            soc.emit("joinRoom", { "chatroomId": room._id });
        }
    }

    const logout = () => {
        socket.disconnect();
    }

    const test = () => {
        console.log(addNewChat);
    }

    return(
        <div className="flex flex-row h-screen bg-slate-50 text-neutral-800 relative overflow-hidden">
            <NewChat isOpen={addNewChatToggle} toggle={setAddNewChatToggle} apiroot={apiroot} setNewChatCreated={setNewChatCreated} setCurrChatroom={setCurrChatroom} />
            <Sidebar username={username} chatrooms={chatrooms} currChatroom={currChatroom} setCurrChatroom={setCurrChatroom} msgNotifs={msgNotifs} setAddNewChat={setAddNewChatToggle}/>
            <Chatroom chatroom={currChatroom} userId={userId} socket={socket} setMsgNotifs={setMsgNotifs} apiroot={apiroot}/>
            {/* <Button onClick={test}></Button> */}
            <Button className="fixed top-[10px] right-[10px] py-[1px] px-[10px] bg-red-600 hover:bg-red-700" onClick={logout}><Link to="/">Log out</Link></Button>
        </div>
    )
};