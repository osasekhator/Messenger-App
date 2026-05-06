import React from "react";

function Login(){
    const handleSubmit = () =>{

    }
    return(
        <div>
            <form onSubmit={handleSubmit} className="login">
                <label for="username">Username: </label>
                <input type="text" name="username" placeholder="Enter your username"/>

                <label for="password">Password: </label>
                <input type="text" name="password" placeholder="********" required/>

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