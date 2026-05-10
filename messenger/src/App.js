import React from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./components/HomePage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ConvoBoard from "./components/ConvoBoard";
import Header from "./components/Header";
import Footer from "./components/Footer"
import { SocketProvider } from "./components/SocketContext";

function App() {
  return (
    <div className="App">
      <Router>
        <SocketProvider>
        <Header/>
          <Routes>
            <Route path= "/" element= {<Homepage/>}/>
            <Route path="/login" element= {<Login/>}/>
            <Route path="/signup" element= {<Signup/>}/>
            <Route path="/conversations" element= {<ConvoBoard/>}/>
          </Routes>
        </SocketProvider>
        <Footer/>
        </Router>
    </div>
  );
}

export default App;
