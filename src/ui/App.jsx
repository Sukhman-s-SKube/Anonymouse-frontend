import React, { useEffect, useState } from 'react';
import axios from "axios";
import './App.css'; // Make sure to create this file
import './wasm_exec.js';

const apiroot = "http://localhost:8000/api";


function test() {
  return new Promise((resolve) => {
    const res = window.test();
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

  useEffect(() => {
    async function loadWasm() {
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), goWasm.importObject);

      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);

  const handleWASM = async () => {
    const t = await test();
  }


  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
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
        handleLogIn();
      })
      .catch((err) => {
        alert("User already exists!")
        setLoggedIn(false);
      });
  };



  if (!loggedIn)localStorage.clear();
  if (loggedIn) {
    return (
      <div className="home_page">
        <div className="sidebar">
          <h1>side bar</h1>
        </div>
        <div className="chatroom">
          <h1 id="d1">chatroom</h1>
          <div>
            <form >
              <input type="text" name="message" required/>
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
        <button onClick={()=>{setLoggedIn(false);}}>Log out</button>
      </div>
    );
  }

  if (!toggleLoginRegister){
    return (
      <div className="login-container">
        <h2 id="d1">Register</h2>
        <form onSubmit={handleRegisteration}>
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
          <button type="submit">Register</button>
          <div className="bttn_group_wrapper">
            <div className="bttn_group">
              <a href="#" className="bttn_two" id="hover" onClick={() => {setToggleLoginRegister(false);}}><span>New?<br/>Register Here</span><div className="bttn_bg"></div></a>
              <a href="#" className="bttn_one" onClick={() => {setToggleLoginRegister(true);}}>Have an account?<br/>Log in here</a>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (toggleLoginRegister){
    return (
      <div className="login-container">
        <h2 id="d1">Login</h2>
        <form onSubmit={handleLogIn}>
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
          <button type="submit">Login</button>
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
  }

  return <h1>You're Not Supposed To See This</h1>;
}

export default App;
