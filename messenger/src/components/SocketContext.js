import React from "react";
import { createContext, useEffect, useRef, useContext } from "react";

const SocketContext = createContext();

 export function SocketProvider({children}){
    const socketRef = useRef(null); // Creating a ref to hold the WebSocket instance and make it persistent across re-renders

    useEffect(() => {
        const token = localStorage.getItem("token"); // Retrieving the token from localStorage

        if(!token) {
            console.error("No token found");
            return;
        }

        socketRef.current = new WebSocket(`ws://localhost:8000/chat?token=${token}`)

        socketRef.current.onopen = () => {
            console.log("WebSocket connected");
        }

        socketRef.current.onclose = () => {
            console.log("WebSocket disconnected");
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close(); // Closing the WebSocket connection when the component unmounts
            }
        }
    }, []); // the empty dependency array ensures that this effect runs only once when the component mounts

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
        <SocketContext.Provider value={{ socketRef, send }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext); // a custom hook to easily access the socket context in other components
