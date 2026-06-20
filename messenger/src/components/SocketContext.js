import React from "react";
import { createContext, useEffect, useRef, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const SocketContext = createContext();

 export function SocketProvider({children}){
    const socketRef = useRef(null); // Creating a ref to hold the WebSocket instance and make it persistent across re-renders
    const navigate = useNavigate();
    const [token, setToken] = useState(localStorage.getItem("token"));

    useEffect(() => {

        if(!token) {
            console.error("No token found");
            return;
        }

        socketRef.current = new WebSocket(`ws://localhost:8000/chat?token=${token}`)

        socketRef.current.onopen = () => {
            console.log("WebSocket connected");
        }

        socketRef.current.onclose = (event) => {
            console.log("WebSocket disconnected");

            if(event.code === 1008) {
                console.error("WebSocket closed due to invalid or expired token");
                localStorage.removeItem("token");
                localStorage.removeItem("sender_id");
                setToken(null);
                navigate("/login");
            }
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close(); // Closing the WebSocket connection when the component unmounts
            }
        }
    }, [token]); //re-run this effect if the token changes (e.g., on login/logout)

    const send = (message) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        }
        else {
            console.error("The WebSocket is not open. Unable to send message.");
        }
    }

    return(
        // Providing the WebSocket instance and the sendMessage function to the rest of the app through context
        <SocketContext.Provider value={{ socketRef, send, setToken }}> {/* Providing the setToken function to allow components to update the token state, e.g., on login/logout*/}
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext); // a custom hook to easily access the socket context in other components
