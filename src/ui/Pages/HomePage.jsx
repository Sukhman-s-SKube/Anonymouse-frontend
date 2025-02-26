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
import { ChatNotifications } from "@/Components/Notifications/ChatNotifications";
import { SettingsModal } from "@/Components/Settings/SettingsModal";

import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "@/Components/ui/themes"; 


export const HomePage = ({ loggedIn, username, userId, apiroot }) => {
    const [socket, setSocket] = useState();
    const [chatrooms, setChatrooms] = useState([]);
    const [currChatroom, setCurrChatroom] = useState();
    const [msgNotifs, setMsgNotifs] = useState({});
    const [addNewChatToggle, setAddNewChatToggle] = useState(false);
    const [newChatCreated, setNewChatCreated] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const currentTheme = darkMode ? darkTheme : lightTheme;
    const [showSidebarContent, setShowSidebarContent] = useState(true);

    useEffect(() => {
      const storedPreference = localStorage.getItem('darkMode');
      if (storedPreference === 'true') {
        setDarkMode(true);
      } else {
        setDarkMode(false);
      }
    }, []);
    

    const toggleDarkMode = () => {
      setDarkMode((prevMode) => {
        const newMode = !prevMode;
        localStorage.setItem('darkMode', newMode ? 'true' : 'false');
        return newMode;
      });
    };

    const handleDeleteChatroom = async (chatroomId) => {
      try {
        await axios.delete(`${apiroot}/chatroom/${chatroomId}`, {
          headers: {
            Authorization: sessionStorage.getItem("JWT"),
          },
        });
        toast.success(`Chatroom ${chatroomId} successfully deleted.`);
        
        if (window.electron && window.electron.deleteMsgs) {
          await window.electron.deleteMsgs(chatroomId);
        }
        
        setChatrooms((prev) => prev.filter((room) => room._id !== chatroomId));
        
        if (currChatroom && currChatroom._id === chatroomId) {
          setCurrChatroom((prevChatrooms) => {
            const updatedChatrooms = chatrooms.filter((room) => room._id !== chatroomId);
            return updatedChatrooms.length > 0 ? updatedChatrooms[0] : null;
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete chatroom.");
      }
    };
    

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
            });
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

    const openNewChat = () => {
      setShowSidebarContent(false);
      setAddNewChatToggle(true);
    };

    const closeNewChat = () => {
      setAddNewChatToggle(false);
      setTimeout(() => {
        setShowSidebarContent(true);
      }, 300); 
    };

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

    return (
        <ThemeProvider theme={currentTheme}>
          <div className={`flex flex-row h-screen relative overflow-hidden ${darkMode ? 'dark' : ''}`}>
            <NewChat
              isOpen={addNewChatToggle}
              toggle={closeNewChat} 
              apiroot={apiroot}
              setNewChatCreated={setNewChatCreated}
              setCurrChatroom={setCurrChatroom}
            />
            <Sidebar
              username={username}
              chatrooms={chatrooms}
              currChatroom={currChatroom}
              setCurrChatroom={(room) => {
                setMsgNotifs((prev) => ({ ...prev, [room._id]: false }));
                setCurrChatroom(room);
              }}
              msgNotifs={msgNotifs}
              setAddNewChat={openNewChat}
              isNewChatOpen={addNewChatToggle}  
              darkMode={darkMode}
              setMsgNotifs={setMsgNotifs}
              showContent={showSidebarContent}
            />
            <Chatroom
              chatroom={currChatroom}
              userId={userId}
              socket={socket}
              setMsgNotifs={setMsgNotifs}
              apiroot={apiroot}
              onDeleteChatroom={handleDeleteChatroom}
            />
            {socket && (
              <ChatNotifications
                socket={socket}
                userId={userId}
                currentChatroomId={currChatroom ? currChatroom._id : undefined}
                chatrooms={chatrooms}
                setMsgNotifs={setMsgNotifs}
              />
            )}
            <div className="fixed top-[10px] right-[10px] flex gap-2">
              <Button
                variant="settings"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </Button>
              <Button
                variant="logout"
                onClick={() => socket.disconnect()}
              >
                <Link to="/">Log out</Link>
              </Button>
            </div>
            {showSettings && (
              <SettingsModal
                onClose={() => setShowSettings(false)}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                apiroot={apiroot}
              />
            )}
          </div>
        </ThemeProvider>
      );
    };