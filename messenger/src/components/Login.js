import React from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useSocket } from "./SocketContext";
import NotificationSystem from "./NotificationSystem";
import "../stylesheets/Login.css";

function Login(){
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [notification, setNotification] = useState("");
    const [notificationType, setNotificationType] = useState("error");
    const [loading, setLoading] = useState(false);
    const { setToken } = useSocket();

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleSubmit = async (e) =>{
        e.preventDefault(); // preventing the default form submission behavior to handle it with JavaScript
        setLoading(true);

        try{
            const response = await fetch('http://localhost:8000/login',
                {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        username, password
                    })
                }
            )

            const data = await response.json();

            if(response.ok){
                console.log("Login successful!")

                localStorage.setItem("token", data.access_token);
                localStorage.setItem("sender_id", data.sender_id);
                setToken(data.access_token); // Update the token state in the SocketContext to trigger a new WebSocket connection

                setUsername("");
                setPassword("");
                setNotificationType("success");
                setNotification("Login successful! Redirecting...");
                await delay(1200);
                navigate("/conversations");
            } else {
                console.error("Login failed:", data.detail);
                setNotificationType("error");
                setNotification(data.detail);
                setLoading(false);
            }
        }
        catch(error){
            console.error("Login failed:", error);
            setLoading(false);
        }
    }

    return(
        <div className="index">
            <h1>Welcome back!</h1>

            <form onSubmit={handleSubmit} className="login">
                <label htmlFor="username">Username: </label>
                <input 
                    type="text" 
                    name="username" 
                    placeholder="Enter your username" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <label htmlFor="password">Password: </label>
                <input 
                    type="text" 
                    name="password" 
                    placeholder="********" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Submit"}
                </button>
            </form>
            {notification && <NotificationSystem message={notification} onClose={() => setNotification("")} type={notificationType}/>}
        </div>
    );
};

/*<div className="welcome">
                
                <h2>Who would you like to chat with?</h2>
                <button onClick={handleDM}>DMs</button>
                <button onClick={handleGroups}>Groups</button>
            </div>*/

export default Login;