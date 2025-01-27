import { useEffect, useState } from "react";
import { Link } from "react-router";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from 'sonner';

import { Chatroom } from "@/Components/Chatroom/Chatroom"
import { Sidebar } from "@/Components/Sidebar/Sidebar"
import { Button } from "@/Components/ui/button";
import { generateDHKeys } from "@/WasmFunctions";

const apiroot = 'http://localhost:8000/api';

export const HomePage = ({ loggedIn, username, userId }) => {
    const [socket, setSocket] = useState();
    const [chatrooms, setChatrooms] = useState([]);
    const [currChatroom, setCurrChatroom] = useState();
    const [msgNotifs, setMsgNotifs] = useState({});

    useEffect(() => {
        async function setupSocket() {
            let tempSoc = await io("http://localhost:8000", {
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

    return(
        <div className="flex flex-row h-screen bg-slate-50 text-neutral-800 relative overflow-hidden">
            <Sidebar username={username} chatrooms={chatrooms} setCurrChatroom={setCurrChatroom} msgNotifs={msgNotifs}/>
            <Chatroom chatroom={currChatroom} userId={userId} socket={socket} setMsgNotifs={setMsgNotifs} />
            {/* <Button onClick={test}></Button> */}
            <Button className="fixed top-[10px] right-[10px] py-[1px] px-[10px] bg-red-600 hover:bg-red-700" onClick={logout}><Link to="/">Log out</Link></Button>
        </div>
    )
};