import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route, HashRouter } from 'react-router';

import { Login } from './Components/User/Login';
import { HomePage } from '@/Pages/HomePage';

import './App.css';
import './wasm_exec.js';

const App = () => {
  
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function loadWasm() {
      const goWasm = new window.Go();
      const result = await WebAssembly.instantiateStreaming(fetch('main.wasm'), goWasm.importObject);

      goWasm.run(result.instance);
      setIsWasmLoaded(true);
    }

    loadWasm();
  }, []);


  return (
    <HashRouter>
      <Toaster position='top-center' richColors />
      <Routes>
        <Route path='/' element={<Login setLoggedIn={setLoggedIn} setUserId={setUserId} setUsername={setUsername} />} />
        <Route path='/home' element={<HomePage loggedIn={loggedIn} username={username} userId={userId} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
