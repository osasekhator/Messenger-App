import React from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Login(){
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) =>{
        e.preventDefault();

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
            setUsername("");
            setPassword("");
            navigate("/dm")
        }
    }

    return(
        <div>
            <form onSubmit={handleSubmit} className="login">
                <label htmlFor="username">Username: </label>
                <input 
                    type="text" 
                    name="username" 
                    placeholder="Enter your username" 
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

                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

/*<div className="welcome">
                
                <h2>Who would you like to chat with?</h2>
                <button onClick={handleDM}>DMs</button>
                <button onClick={handleGroups}>Groups</button>
            </div>*/

export default Login;