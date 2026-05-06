import React from "react";
import ChatRoom from "./ChatRoom";
import Header from "./Header";
import Footer from "./Footer";
import "./App.css"

function DMess(){
    return(
        <div>
            <Header/>
            <div>
                <ChatRoom/>
            </div>
            <Footer/>
        </div>
    );
};

export default DMess;