import React, { useEffect, useState } from 'react';
import './App.css'; // Make sure to create this file

import '../encryption/wasm_exec.js';

function test() {
  return new Promise((resolve) => {
    const res = window.test();
    resolve(res);
  })
}

function App() {
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    async function loadWasm() {
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch('src/encryption/main.wasm'), goWasm.importObject);

      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);

  const handleWASM = async () => {
    await test();
  }

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Send credentials to the backend for verification
    // Simulate successful login
    setLoggedIn(true);
  };

  if (loggedIn) {
    return <h1>Hello</h1>;
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="button" onClick={handleWASM}>Handle WASM</button>
      </form>
    </div>
  );
}

export default App;
