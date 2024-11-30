import React, { useEffect, useState } from 'react';
import axios from "axios";
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

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [toggleLoginRegister, setToggleLoginRegister] = useState(true);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
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

  const registerDHKeys = async() =>{
    const keys = await generateDHKeys(100);
    const tK = JSON.parse(keys)
    
    const date = new Date()
    const enc = await encryptMsg(tK.keys[0].pubKey, 'hello', date.toJSON());


    const dec = await decryptMsg(enc.pubKey, tK.keys[0].privKey,
                                 enc.cipherText, date.toJSON());
    console.log(enc)
    console.log(dec)
    document.getElementById("d1").innerHTML = typeof dec

    // if(keys["error"] != null) {alert("GO error.");return;}
    // axios
    //   .put(`${apiroot}/user/dh_keys`,keys,{
    //     headers: {
    //         Authorization: sessionStorage.getItem("JWT"),
    //     },
    //   }
    //   )
    //   .then((response) => {
    //     alert("Diffie-Hellman keys did updated successfully.")
    //   })
    //   .catch((err) => {
    //     alert("Diffie-Hellman keys did NOT updated successfully.")
    //   });
  }

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };

  const handleLogIn = (e) => {
    e.preventDefault();
    axios
      .post(`${apiroot}/user/login`, 
        credentials
      )
      .then((response) => {
        sessionStorage.setItem("JWT", response.data.token);
        
        setLoggedIn(true)
        getChatrooms()
      })
      .catch((err) => {
        alert("Email or Password is incorrect.")
        setLoggedIn(false);
      });

  };

  const handleRegisteration = (e) => {
    e.preventDefault();
    axios
      .post(`${apiroot}/user`, 
        credentials
      )
      .then((response) => {
        registerDHKeys()
      })
      .catch((err) => {
        alert("User already exists!")
        setLoggedIn(false);
      })
      .finally(() => {
        handleLogIn(e)
      });

  };

  const getChatrooms = (e)=>{
    axios
      .get(`${apiroot}/chatroom`, {
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      }).then((response) => {
          setChatrooms(response.data);
      }).catch((err) => {
          // setTimeout(getChatrooms, 3000);
      });
    };
    

  const getMessages = (chatroomID) => (e)=>{
    setChatroomId(chatroomID)
    axios
      .get(`${apiroot}/message/${chatroomID}`, {
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      }).then((response) => {
          const currentChat = response.data
          const prevChats = JSON.parse(localStorage.getItem(chatroomID))
          let newChats = prevChats==null? currentChat:currentChat.filter((e) => prevChats.every((val) => val._id !== e._id));
          let finalChats = prevChats==null? currentChat:prevChats.concat(newChats); 
          setMessages(finalChats)
          localStorage.setItem(chatroomID, JSON.stringify(finalChats))
      }).catch((err) => {
        setMessages([])
      });
      
  };

  const sendMessage = (e) =>{
    e.preventDefault();
    axios
      .post(`${apiroot}/message`, {
        chatroom_id: chatroomId,
        content: message,
      }, {
        headers: {
            Authorization: sessionStorage.getItem("JWT"),
        },
      }).then((response) => {
        const prevChats = JSON.parse(localStorage.getItem(chatroomId))
        let newMessage = prevChats==null?[response.data]:prevChats.concat([response.data])
        setMessages(newMessage)
        localStorage.setItem(chatroomId, JSON.stringify(newMessage))
      }).catch((err) => {
        alert("Message Failed To Send")
      });
  };

  
  if (loggedIn) {
    return (
      <div className="home_page">
        <div className="sidebar">
          <h3>Welcome {credentials.username}</h3>
          <div>
              {chatrooms.length==0?'no chatrooms to show':chatrooms.map((chatroom) => (
                  <div key={chatroom._id}>
                      <button onClick={getMessages(chatroom._id)}>{chatroom.name}</button>
                  </div>
              ))}
          </div>
        </div>
        <div className="chatroom">
          <h1  id="d1">chatroom</h1>
          <div>
            {messages.length==0?'no chats to show':messages.map((msg) => (
                <div key={msg._id}>
                  <p>{msg.sender}: {msg.content}</p>
                </div>
            ))}
            <div>
              {chatroomId==''?<div></div>:
              <form onSubmit={sendMessage}>
                <input type="text" name="message" value={message} onChange={handleMessage} required/>
                <button type="submit">Send</button>
              </form>
              }
            </div>
          </div>
        </div>
        <button onClick={()=>{setLoggedIn(false);chatrooms.length = 0;}}>Log out</button>
      </div>
    );
  }

  if (!loggedIn){
    localStorage.clear();
    return (
      <div className="login-container">
        <h2 onClick={registerDHKeys} id="d1">{toggleLoginRegister?'Login':'Register'}</h2>
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
          {/* <button type="button" onClick={handleWASM}>Handle WASM</button> */}
        </form>
      </div>
    );
  };
  
  return (<h1>You're Not Suppose To See This</h1>);
}

export default App;
