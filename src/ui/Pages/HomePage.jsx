import { useEffect, useState } from "react";
import { useNavigate } from 'react-router';
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from 'sonner';

import { Chatroom } from "@/Components/Chatroom/Chatroom";
import { Sidebar } from "@/Components/Sidebar/Sidebar";
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
  const [newChatCreated, setNewChatCreated] = useState();
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSidebarContent, setShowSidebarContent] = useState(true);
  const [loadingChatrooms, setLoadingChatrooms] = useState(true); 
  const navigate = useNavigate();

  const currentTheme = darkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const storedPreference = localStorage.getItem('darkMode');
    setDarkMode(storedPreference === 'true');
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
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
      
      if (window.electron && window.electron.deleteMsgs) {
        await window.electron.deleteMsgs(chatroomId);
      }
      
      setChatrooms((prev) => prev.filter((room) => room._id !== chatroomId));
      
      if (currChatroom && currChatroom._id === chatroomId) {
        setCurrChatroom(chatrooms.filter((room) => room._id !== chatroomId)[0] || null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete chatroom.");
    }
  };

  useEffect(() => {
    async function setupSocket() {
      let tempSoc = await io("https://se4450.duckdns.org/", {
        extraHeaders: { Authorization: sessionStorage.getItem("JWT") },
      });
      setSocket(tempSoc);
    }
    if (loggedIn) {
      setupSocket();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (socket != null) {
      socket.on('connect', async () => {
        await getChatroomsRequest(socket);
      });

      socket.on("newChatroom", (chatroomData) => {
        setChatrooms((prevChatrooms) => [...prevChatrooms, chatroomData]);
        socket.emit("joinRoom", { chatroomId: chatroomData._id });
        toast.info(`New chatroom created with ${chatroomData.name}`);
      });

      socket.on("chatroomDeleted", (data) => {
          console.log("Chatroom deleted:", data);
          setChatrooms((prevChatrooms) =>
            prevChatrooms.filter((chatroom) => chatroom._id !== data.chatroomID)
          );
          setCurrChatroom((prev) =>
            prev?._id === data.chatroomID ? null : prev
          );
          toast.info(`Chatroom ${data.chatroomName} was deleted.`);
      });
      
      return () => {
        socket.off("newChatroom");
        socket.off("deletedChatroom");
        socket.off("chatroomDeleted");
        socket.off("joinedUserRoom");
      };
    }
    else {
      console.log("socket did not connnect")
    }
  }, [socket]);

  useEffect(() => {
    if (newChatCreated) {
      let found = chatrooms.some((chatroom) => (chatroom._id === newChatCreated._id) )
      if (!found) {
        setChatrooms((prevChatrooms) => [...prevChatrooms, newChatCreated]);
        if (socket){
          socket.emit("joinRoom", { chatroomId: newChatCreated._id });
        }
      }
    }
    setNewChatCreated();
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
  
  const getChatroomsRequest = async (soc) => {
    setLoadingChatrooms(true);
    let response;
    try {
      response = await axios.get(`${apiroot}/chatroom`, {
        headers: { Authorization: sessionStorage.getItem("JWT") },
      });
    } catch (err) {
      toast.error("Error getting chatrooms. Check Console");
      console.log(err);
      setLoadingChatrooms(false);
      return;
    }
    setChatrooms(response.data);
    response.data.forEach((room) => {
      soc.emit("joinRoom", { chatroomId: room._id });
    });
    setLoadingChatrooms(false);
  };

  const logout = () => {
    socket.disconnect();
    navigate('/');
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
          loadingChatrooms={loadingChatrooms} 
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
          onDeleteChatroom={handleDeleteChatroom}
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
          <Button variant="settings" onClick={() => setShowSettings(true)}>Settings</Button>
          <Button variant="logout" onClick={logout}>Log out</Button>
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
