import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext";

function ChatRoom({ conversation }) {

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const { socketRef, send } = useSocket();

    // useEffect for joining a room and loading message history
    useEffect(() => {
        if (!conversation || !socketRef.current) {
            console.log("early return — conversation:", conversation, "socket:", socketRef.current);
            return;
        }

        //if (!conversation) return;
        console.log("Selected convo:", conversation);

        setMessages([]); // clear old messages when switching conversations

        const payload = {
            type: "join",
            conversation_id: conversation._id
        }

        send(payload);
        console.log("Sent join for:", conversation._id);

        if (!socketRef.current) return;

        const loadHistory = (event) => {
            const data = JSON.parse(event.data);
            //console.log("Selected convo:", conversation);
            console.log("Received:", data);

            setMessages((prev) => [...prev, data]);
        };

        
         socketRef.current.addEventListener("message", loadHistory); // listen for the next message to add to the history

        return() => {
            socketRef.current.removeEventListener("message", loadHistory); // cleanup the event listener when the component unmounts or conversation changes
        };

    }, [conversation]);

    const sendMessage = () => {

        if (!input.trim()) return;

        const message = {
            type: "message",
            conversation_id: conversation._id,
            content: input
        }

        send(message);

        setInput("");
    };

    return (
        <div>
            <div>
                {messages.map((msg, i) => (
                    <p key={i}>
                        <strong>{msg.sender}:</strong> {msg.content}
                    </p>
                ))}
            </div>

            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        sendMessage();
                    }
                }}
            />

            <button onClick={sendMessage}>
                Send
            </button>
        </div>
    );
}

export default ChatRoom;