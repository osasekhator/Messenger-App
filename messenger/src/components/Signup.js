import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import NotificationSystem from "./NotificationSystem";
import "../stylesheets/Signup.css";

function Signup(){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [notification, setNotification] = useState("");
    const [notificationType, setNotificationType] = useState("error");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleSubmit = async (e) =>{
        e.preventDefault();

        setLoading(true);

        try{
            const response = await fetch('http://localhost:8000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({username, password}),
            });

            const data = await response.json();

            if(response.ok){
                console.log("Signup successful:", data)
                setUsername("");
                setPassword("");
                await delay(1200);
                navigate("/login");
            }
            else{
                console.error("Signup failed:", data.detail);
                setNotification(`Signup failed: ${data.detail}`);
                setNotificationType("error");
            }
        }
        catch(error){
            console.error("Signup error:", error);
            setNotification("Signup error: Please try again later.");
            setNotificationType("error");
            setLoading(false);
        }
    };

    // Validation function for username and password. called on form submission to ensure inputs meet criteria before sending to backend
    function verifyInputs(username, password) {
        // allow Unicode letters, numbers, underscores and symbol/emoji characters; 4-20 chars
        const usernameRegex = /^[\p{L}\p{N}\p{So}_]{4,20}$/u;
        // allow any characters but require at least one letter and one digit, minimum length 8
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        return usernameRegex.test(username) && passwordRegex.test(password);
    }

    return(
        <div className="index">
            <h1>Create an account!</h1>
            <form onSubmit={(e) => {
                e.preventDefault();
                if (verifyInputs(username, password)) {
                    setNotification("Account created successfully! Redirecting to login...");
                    setNotificationType("success");
                    handleSubmit(e);
                } else {
                    console.error("Invalid input");
                    setNotification("Invalid input: Your username must be 4-20 characters (letters, numbers, underscores, or emoji). The password must be at least 8 characters and include at least one letter and one number (special characters allowed).");
                    setNotificationType("info");
                }
            }} className="signup">
                <label htmlFor="username">Username: </label>
                <input 
                type="text" 
                name="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"/>

                <label htmlFor="password">Password: </label>
                <input 
                type="text" 
                name="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********" 
                required/>

                <button type="submit" disabled={loading}>
                    {loading ? "Signing up..." : "Signup"}
                </button>
            </form>
            {notification && <NotificationSystem message={notification} onClose={() => setNotification("")} type={notificationType} />}
        </div>
    );
};

export default Signup;