import React, { useEffect, useState, useRef } from 'react';
import axios from "axios";
import { io } from "socket.io-client";
import { Toaster, toast } from 'sonner';

import './App.css';
import './wasm_exec.js';

const apiroot = "http://localhost:8000/api";

async function generateDHKeys(numKeys) {// Parameters (1): numKeys int
  return new Promise((resolve) => {
    const res = window.generateDHKeys(numKeys);
    resolve(res);
  })
}
async function encryptMsg(otherPubDH, msg, timestamp) {// Paramters (3): otherPubDH string, msg string, timestamp string
  return new Promise((resolve) => {
    const res = window.encryptMsg(otherPubDH, msg, timestamp);
    resolve(res);
  })
}
async function decryptMsg(otherPubDH, myPrvDH, cipherText, timestamp) {// Paramters (4): otherPubDH string, myPrvDH string, cipherText string, timestamp string
  return new Promise((resolve) => {
    const res = window.decryptMsg(otherPubDH, myPrvDH, cipherText, timestamp);
    resolve(res);
  })
}

let socket;

const App = () => {
  
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [toggleLoginRegister, setToggleLoginRegister] = useState(true);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    _id: '',
  });
  const [chatrooms, setChatrooms] = useState([]);
  const [chatroomId, setChatroomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadWasm() {
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), goWasm.importObject);

      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);

  const createDB = async() => {
    await window.electron.createDB()
    console.log('DB created')
  };
  const createDHTable = async() => {
    await window.electron.createDHTable()
    console.log('DH Key Table created')
  };
  
  const genAndStoreDHKeys = async() => {
    await window.electron.delAllDHKeys() // for testing purposes, DO NOT keep this here, fix the issue

    const genDHKeys = await generateDHKeys(100);
    const DH = JSON.parse(genDHKeys)
    if(DH.error !== undefined) 
      return await toast.error('GO DH keys error: ', DH.error);
    
    await window.electron.insertDHKeys(DH.keys)
    console.log('DH Keys stored')
    
    console.log(DH.keys)
    for(let key of DH.keys){
      delete key.privKey
    }
    console.log('DH priv Keys removed')
    console.log(DH.keys)
    
    axios
      .put(`${apiroot}/user/dh_keys`,DH.keys,{
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      }
      )
      .then((response) => {
        console.log("Diffie-Hellman keys updated successfully.")
      })
      .catch((err) => {
        console.log("Diffie-Hellman keys NOT updated successfully.")
      });


    // const date = new Date()
    // const enc = await encryptMsg(tK.keys[0].pubKey, 'hello', date.toJSON());


    // const dec = await decryptMsg(enc.pubKey, tK.keys[0].privKey,
    //                              enc.cipherText, date.toJSON());
    // console.log(enc)
    // console.log(dec)
    // document.getElementById("d1").innerHTML = typeof dec
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

  const handleLogIn = (e) => {
    e.preventDefault();
    axios
      .post(`${apiroot}/user/login`, 
        credentials
      )
      .then((response) => {
        const token = response.data.token;
        sessionStorage.setItem("JWT", token);
        // Decode the token to extract the user ID
        const decodedToken = parseJwt(token);
        const userId = decodedToken.user_id; // Extract user_id
        setCredentials({
          ...credentials,
          _id: userId,
        });

        setupSocket();
      })
      .catch((err) => {
        toast.error('Email or Password is incorrect.')
        setLoggedIn(false);
      });

  };

  const setupSocket = () => {
    socket = io("http://localhost:8000", {
          extraHeaders: {
            AUTHORIZATION: sessionStorage.getItem("JWT"),
          }
    });

    
    socket.on("error", (data) => {
      toast.error("Socket error. Check console.")
      console.log(data);
    });
    socket.on("notification", (data) => {
      console.log(data);
    });
    socket.on("newMessage", handleMsgIn);

    socket.on("connect", () => {
      setLoggedIn(true);
      genAndStoreDHKeys();
      getChatrooms();
    });
  };

  const handleMsgIn = (data) => {
    console.log(data);
    addMessage(data, data.chatroom);
  };  


  const handleLogout = () => {
  // Clear all relevant states
  setChatroomId('');
  setMessages([]);
  setMessage('');
  setCredentials({
    username: '',
    password: '',
    _id: '',
  });
  socket.disconnect();

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
    

  const getMessages = (chatroomID) => async (e) =>{
    setChatroomId(chatroomID);

    try {
      let response = await axios.get(`${apiroot}/message/${chatroomID}`, {
        headers: {
          Authorization: sessionStorage.getItem("JWT"),
        }
      });
      // console.log(response);
      const currentChat = response.data
      const prevChats = JSON.parse(localStorage.getItem(chatroomID))
      let newChats = prevChats == null ? currentChat : currentChat.filter((e) => prevChats.every((val) => val._id !== e._id));
      let finalChats = prevChats==null ? currentChat : prevChats.concat(newChats); 
      setMessages(finalChats)
      localStorage.setItem(chatroomID, JSON.stringify(finalChats))
      setTimeout(scrollToBottom, 10);

    } catch (e) {
      setMessages([]);
    }      
  };

  const messagesEndRef = useRef(null); 
  const messageInputRef = useRef(null);
  const scrollToBottom = () => {
    console.log("Scrolling to bottom");
    messagesEndRef.current?.scrollIntoView({ behaviour: 'smooth'});
  };

  const addMessage = (msg, roomId) => { 
    const prevChats = JSON.parse(localStorage.getItem(roomId))
    let newMessage = prevChats == null ? [msg] : prevChats.concat([msg])
    setMessages(newMessage)
    localStorage.setItem(roomId, JSON.stringify(newMessage))
    setMessage('');
    setTimeout(scrollToBottom, 10); 
  };

  const sendMessage = (e) =>{
    e.preventDefault();
    if (!message.trim()) return; // no empty messages

    socket.emit("chatroomMessage", {
      "chatroomId": chatroomId,
      "message": message
    });
    messageInputRef.current.focus();
  };

  
  if (loggedIn) {
    return (
      <div className="home_page">
        <Toaster position='top-center' richColors />
        <div className="sidebar">
          <h3>Welcome, {credentials.username}</h3>
          <div>
              {chatrooms.length==0?'no chatrooms to show': chatrooms.map((chatroom) => (
                  <div key={chatroom._id}>
                      <button onClick={getMessages(chatroom._id)}>{chatroom.name}</button>
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
                  key={msg._id}
                  className={`message ${
                    msg.sender === credentials._id ? 'sender' : 'receiver'
                  }`}
                >
                  <div className="bubble">
                    <p>{msg.content || msg.message}</p>
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
      <div className="login-container">
        <Toaster position='top-center' richColors />
        <button onClick={()=>{createDB();createDHTable();}}>Create db + table</button>
        <h2 onClick={genAndStoreDHKeys} id="d1">{toggleLoginRegister?'Login':'Register'}</h2>
        <form onSubmit={toggleLoginRegister?handleLogIn:handleRegisteration}>
          <div>
            <label>Username:</label><br />
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Password:</label><br />
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit">{toggleLoginRegister?'Login':'Register'}</button>
          <div className="bttn_group_wrapper">
            <div className="bttn_group">
              <a href="#" className="bttn_two" id="hover" onClick={() => {setToggleLoginRegister(false);}}><span>New?<br/>Register Here</span><div className="bttn_bg"></div></a>
              <a href="#" className="bttn_one" onClick={() => {setToggleLoginRegister(true);}}>Have an account?<br/>Log in here</a>
            </div>
          </div>
        </form>
      </div>
    );
  };
  
  return (<h1>You're Not Suppose To See This</h1>);
}

export default App;
