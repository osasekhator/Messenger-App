import React from "react";
import { useNavigate } from "react-router-dom";
import "../stylesheets/HomePage.css";

function HomePage(){
    const navigate = useNavigate();

    const handleLogin = () =>{
        navigate("/login")
    }

    const handleSignup = () =>{
        navigate("/signup")
    }

    return(
        <main className="index">
            <div>
                <h1>Welcome to our online messenger!</h1>
                <form>
                    <h2>Do you have an account?</h2>
                    <button onClick={handleLogin}>Yes, I do!</button>
                    <button onClick={handleSignup}>Signup</button>
                </form>
            </div>
        </main>
    );
}

export default HomePage;