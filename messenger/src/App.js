import React from "react";
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./HomePage";
import DMess from "./DMess";
import GChats from "./GChats";
import Login from "./Login";
import Signup from "./Signup";
import Header from "./Header";
import Footer from "./Footer"

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
