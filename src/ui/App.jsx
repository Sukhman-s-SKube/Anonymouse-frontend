import React, { useEffect, useState, useRef } from 'react';
import axios from "axios";
import { io } from "socket.io-client";
import { Toaster, toast } from 'sonner';

import { Login } from '@/Components/User/Login';
import { Chatroom } from '@/Components/Chatroom/Chatroom';

import './App.css';
import './wasm_exec.js';

const apiroot = "http://localhost:8000/api";

async function generateDHKeys(numKeys) {// Parameters (1): numKeys int
  return new Promise((resolve) => {
    const res = window.generateDHKeys(numKeys);
    resolve(res);
  });
}
async function encryptMsg(otherPubDH, msg, timestamp) {// Paramters (3): otherPubDH string, msg string, timestamp string
  return new Promise((resolve) => {
    const res = window.encryptMsg(otherPubDH, msg, timestamp);
    resolve(res);
  });
}
async function decryptMsg(cipherText, timestamp, otherPubDH, myPrvDH) {// Paramters (4): cipherText string, timestamp string, otherPubDH string || masterSec string, myPrvDH string || null
  return new Promise((resolve) => {
    const res = window.decryptMsg(cipherText, timestamp, otherPubDH, myPrvDH);
    resolve(res);
  });
}

let socket;

const App = () => {
  
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [username, setUserName] = useState("")
  const [toggleLoginRegister, setToggleLoginRegister] = useState(true);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    _id: '',
  });
  const [chatrooms, setChatrooms] = useState([]);
  const [chatroomId, setChatroomId] = useState('');
  const [chatroomMember, setChatroomMember] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [newMessageIndicator, setNewMessageIndicator] = useState({});
  const outMsgKeys = useRef({});

  useEffect(() => {
    async function loadWasm() {
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), goWasm.importObject);

      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);

  const credentialsRef = useRef(credentials);
  const chatroomIdRef = useRef(chatroomId);
  const chatroomsRef = useRef(chatrooms);

  useEffect(() => {
    chatroomsRef.current = chatrooms;
  }, [chatrooms]);
  
  useEffect(() => {
    credentialsRef.current = credentials;
  }, [credentials]);
  
  useEffect(() => {
    chatroomIdRef.current = chatroomId;
  }, [chatroomId]);

  // useEffect(() => {
  //   console.log("Current credentials:", credentials);
  // }, [credentials]);

  // useEffect(() => {
  //   console.log("Current chatroom ID:", chatroomId);
  // }, [chatroomId]);

  // useEffect(() => {
  //   console.log("Messages updated:", messages);
  // }, [messages]);

  const createDB = async() => {
    await window.electron.createDB();
    // console.log('DB created');
  };
  const createDHTable = async() => {
    await window.electron.createDHTable();
    // console.log('DH Key Table created');
  };
  const createMsgsTable = async() => {
    await window.electron.createMsgsTable();
    // console.log('Msgs Table created');
  };
  
  const genAndStoreDHKeys = async() => {
    const numKeys = 100;

    const genDHKeys = await generateDHKeys(numKeys);
    const DH = JSON.parse(genDHKeys);
    if(DH.error !== undefined) return toast.error('GO DH keys error: ', DH.error);
    
    await window.electron.insertDHKeys(DH.keys);

    let keys = await window.electron.getKeys(numKeys);

    // for(let key in DH.keys) {
    //   DH.keys[key].id = ids[key];
    //   delete DH.keys[key].privKey;
    // }

    try {
      await axios.put(`${apiroot}/user/dh_keys`, keys, {
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      });
    } catch(e) {
      console.log(e);
      return toast.error("Gen Keys: Failed to send keys to server. Check console for error");
    }
  }

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };
  
  function parseJwt(token) {
    const base64Url = token.split('.')[1]; // Get the payload part of the token
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
  
  const handleLogIn = async (e) => {
    e.preventDefault();

    let response;
    try {
      response = await axios.post(`${apiroot}/user/login`, credentials);
    } catch(err) {
      setLoggedIn(false);
      toast.error("Login: Failed to login. Check console for error");
      console.log(err);
      return;
    }
    
    const token = response.data.token;
    sessionStorage.setItem("JWT", token);

    // Decode the token to extract the user ID
    const decodedToken = parseJwt(token);
    const userId = decodedToken.user_id; // Extract user_id
    setCredentials({ ...credentials, _id: userId });

    await setupSocket();
  };

  const setupSocket = async () => {
    socket = io("http://localhost:8000", {
      extraHeaders: {
        Authorization: sessionStorage.getItem("JWT"),
      }
    });

    
    socket.on("error", (data) => {
      toast.error("Socket error. Check console.")
      console.log(data);
    });
    socket.on("notification", (data) => {
    });
    socket.on("newMessage", await handleMsgIn);

    socket.on("connect", () => {
      setLoggedIn(true);
      genAndStoreDHKeys();
      getChatrooms();
    });

  };
  

  const handleMsgIn = async (data) => {
    const currentUserId = userId;
    const currentChatroomId = chatroomIdRef.current;
  
    if (data.sender === currentUserId) {
      let hash = await window.electron.sha256(data.message.content + data.message.pubKey + data.message.timestamp);
      if (outMsgKeys.current[hash]) {
        let res = await decryptMsg(data.message.content, data.message.timestamp, outMsgKeys.current[hash], "");
        if (res["error"] != "") {
          console.log(res["error"]);
          return toast.error("Msg In: Failed to decrypt msg. Check console for error");
        }

        delete outMsgKeys.current[hash];
        data.message.content = res["plainText"];
        // data._id = parseInt(data._id, 16);
        await addMessage(data, data.chatroom);
      }
      return;
    }

    let myKey = await electron.getDHKey(parseInt(data.message.privKeyId));

    let res = await decryptMsg(data.message.content, data.message.timestamp, data.message.pubKey, myKey.privKey);
    if (res["error"] != "") {
      console.log(res["error"]);
      return toast.error("Msg In: Failed to decrypt msg. Check console for error");
    }
    data.message.content = res["plainText"];
    // data._id = parseInt(data._id, 16);
    // If the message belongs to the currently active chatroom
    if (data.chatroom === currentChatroomId) {
      await addMessage(data, currentChatroomId); // Add it to the UI immediately
    } else {
      const chatroomName =
        chatroomsRef.current.find((room) => room._id === data.chatroom)?.name ||
        'unknown chatroom';
    
      toast(`New message in ${chatroomName}`);
        setNewMessageIndicator((prev) => ({
        ...prev,
        [data.chatroom]: true, // Mark the other chatroom as having new messages
      }));
    }
  };

  const handleLogout = () => {
  // Clear all relevant states
  setChatroomId('');
  setMessages([]);
  setMessage('');
  // setCredentials({
  //   username: '',
  //   password: '',
  //   _id: '',
  // });
  // socket.disconnect();

  // Clear local and session storage
  localStorage.clear();
  sessionStorage.clear();

  // Reset logged-in status
  setLoggedIn(false);
  };

  const handleRegisteration = (e) => {
    e.preventDefault();
    axios
      .post(`${apiroot}/user`, 
        credentials
      )
      .then((response) => {
        registerDHKeys();
        handleLogIn(e);
      })
      .catch((err) => {
        toast.error("User already exists!")
        setLoggedIn(false);
        return;
      });
  };

  const getChatrooms = () => {
    axios
      .get(`${apiroot}/chatroom`, {
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      }).then((response) => {
          setChatrooms(response.data);
          for (let room of response.data) {
            socket.emit("joinRoom", { "chatroomId": room._id });
          }
      }).catch((err) => {
          // setTimeout(getChatrooms, 3000);
      });
    };
    

  const getMessages = (room) => async (e) => {
    setChatroomId(room._id);

    setNewMessageIndicator((prev) => ({
      ...prev,
      [room._id]: false,
    }));

    for (let mem of room.members) {
      if (mem != userId) {
        setChatroomMember(mem);
        break;
      }
    }
    
    try {
      let response = await axios.get(`${apiroot}/message/${room._id}`, {
        headers: {
          Authorization: sessionStorage.getItem("JWT"),
        }
      });
      const currentChat = response.data;
      let storedChat = await window.electron.getMsgs(room._id);


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

      let finalChat = await window.electron.getMsgs(room._id);
      setMessages(finalChat);
      

      // const prevChats = JSON.parse(localStorage.getItem(room._id))

      // let newChats = prevChats == null ? currentChat : currentChat.filter((e) => prevChats.every((val) => val._id !== e._id));
      // let finalChats = prevChats==null ? currentChat : prevChats.concat(newChats); 
      // setMessages(finalChats)
      // localStorage.setItem(room._id, JSON.stringify(finalChats))
      setTimeout(scrollToBottom, 10);

    } catch (e) {
      setMessages([]);
    }      
  };

  const messagesEndRef = useRef(null); 
  const messageInputRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behaviour: 'smooth'});
  };


  const addMessage = async (msg, roomId) => {
    const prevChats = JSON.parse(localStorage.getItem(roomId)) || [];
    const updatedMessages = [...prevChats, msg];
    window.electron.insertMsg(msg);
    let parsedMsg = await window.electron.getMsg(msg._id);
  
    if (roomId === chatroomIdRef.current) {
      // Update the UI for the current chatroom
      setMessages((prevMessages) => [...prevMessages, parsedMsg]); // Append the new message
      setTimeout(scrollToBottom, 10); // Scroll to the latest message
    }
  
    // Always update localStorage for the respective chatroom
    // localStorage.setItem(roomId, JSON.stringify(updatedMessages));
  };
  
  

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return; // no empty messages
    
    let response;

    try {
      response = await axios.delete(`${apiroot}/user/dh_keys/${chatroomMember}`, {
        headers: {
          Authorization: sessionStorage.getItem("JWT"),
        }
      });
    } catch (e) {
      toast.error("Sending Msg: Failed to get other user's key. Check console for error");
      console.log(e);
      return
    }

    const otherPubDH = response.data.popped_key.pubKey;
    const otherPubDHId = response.data.popped_key.id; 
    const timestamp = new Date();


    let encData = await encryptMsg(otherPubDH, message, timestamp.toJSON());
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
      "chatroomId": chatroomId,
      "message": payload
    });
    setMessage('')
    messageInputRef.current.focus();
  };
  
  
  
  
  if (loggedIn) {
    return (
      <div className="home_page">
        <Toaster position='top-center' richColors />
        <div className="sidebar">
          <h3>Welcome, {username}</h3>
          <div>
              {chatrooms.length==0?'no chatrooms to show': chatrooms.map((chatroom) => (
                  <div key={chatroom._id}>
                      <button 
                      onClick={getMessages(chatroom)}
                      className={newMessageIndicator[chatroom._id] ? 'new-message' : ''}
                      >
                        {chatroom.name}</button>
                  </div>
              ))}
          </div>
        </div>
        <div className="chatroom">
          <h1 id="d1">Chatroom</h1>
          
          <div className="messages-container">
            {messages.length === 0 ? (
              'No chats to show'
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.mongoId}
                  className={`message ${
                    msg.sender === userId ? 'sender' : 'receiver'
                  }`}
                >
                  <div className="bubble">
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef}></div>
          </div>

          {chatroomId !== '' && (
            <form className="message-form" onSubmit={sendMessage}>
              <input
                type="text"
                name="message"
                value={message}
                onChange={handleMessage}
                required
                ref={messageInputRef}
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
        <button className="logout-button" onClick={handleLogout}>Log out</button>
      </div>
    );
  }

  if (!loggedIn){
    localStorage.clear();
    return (
      <div className='overflow-y-hidden'>
        <Toaster position='top-center' richColors />
        {/* <Login setLoggedIn={setLoggedIn} setUserId={setUserId} setUsername={setUserName}/> */}
        <Chatroom chatroomId={chatroomId} />
      </div>
      // <div className="login-container">
      //   <Toaster position='top-center' richColors />
      //   <button onClick={()=>{createDB();createDHTable();createMsgsTable();}}>Create db + table</button>
      //   <h2 onClick={genAndStoreDHKeys} id="d1">{toggleLoginRegister?'Login':'Register'}</h2>
      //   <form onSubmit={toggleLoginRegister?handleLogIn:handleRegisteration}>
      //     <div>
      //       <label>Username:</label><br />
      //       <input
      //         type="text"
      //         name="username"
      //         value={credentials.username}
      //         onChange={handleChange}
      //         required
      //       />
      //     </div>
      //     <div>
      //       <label>Password:</label><br />
      //       <input
      //         type="password"
      //         name="password"
      //         value={credentials.password}
      //         onChange={handleChange}
      //         required
      //       />
      //     </div>
      //     <button type="submit">{toggleLoginRegister?'Login':'Register'}</button>
      //     <div className="bttn_group_wrapper">
      //       {/* <div className="bttn_group"> */}
      //         <div class='toggle-btn-bg'></div>
      //         <button type='button' class="toggle-btn">Have an account?<br />Log in here</button>
      //         <button type='button' class="toggle-btn">New?<br />Register Here</button>
      //         {/* <a href="#" className="bttn_two" id="hover" onClick={() => {setToggleLoginRegister(false);}}>
      //           <span>New?<br/>Register Here</span>
      //           <div className="bttn_bg"></div>
      //         </a>
      //         <a href="#" className="bttn_one" onClick={() => {setToggleLoginRegister(true);}}>Have an account?<br/>Log in here</a> */}
      //       {/* </div> */}
      //     </div>
      //   </form>
      // </div>
    );
  };
}

export default App;
