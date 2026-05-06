import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import MainSection from "./MainSection";
import "./App.css";


function HomePage(){
    return(
        <div className="home">
            <MainSection />
        </div>
    );
}

export default HomePage;

/*<Login/>
    <div className="welcome">
                
        <h2>Who would you like to chat with?</h2>
        <button onClick={handleDM}>DMs</button>
        <button onClick={handleGroups}>Groups</button>
    </div>*/