import React, { useState } from "react";
import { useEffect, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

function Signup(){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        e.preventDefault();

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
                navigate("/login");
            }
            else{
                console.error("Signup failed:", data.detail);
            }
        }
        catch(error){
            console.error("Signup error:", error);
        }
    };

    // Validation function for username and password. called on form submission to ensure inputs meet criteria before sending to backend
    function verifyInputs(username, password) {
        const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/; // alphanumeric and underscores, 4-20 chars
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; // minimum of 8 chars, at least one letter and one number
        return usernameRegex.test(username) && passwordRegex.test(password);
    }

    return(
        <div>
            <form onSubmit={(e) => {
                e.preventDefault();
                if (verifyInputs(username, password)) {
                    handleSubmit(e);
                } else {
                    console.error("Invalid input");
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

                <button type="submit">Signup</button>
            </form>
        </div>
    );
};

export default Signup;