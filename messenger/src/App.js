import React from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./components/HomePage";
import DMess from "./components/DMess";
import GChats from "./components/GChats";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Header from "./components/Header";
import Footer from "./components/Footer"

function App() {
  return (
    <div className="App">
      <Router>
        <Header/>
        <Routes>
          <Route path= "/" element= {<Homepage/>}/>
          <Route path= "/dm" element= {<DMess/>}/>
          <Route path= "/groups" element= {<GChats/>}/>
          <Route path="/login" element= {<Login/>}/>
          <Route path="/signup" element= {<Signup/>}/>
          
        </Routes>
        <Footer/>
      </Router>
    </div>
  );
}

export default App;
