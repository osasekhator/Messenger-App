import React, { useEffect, useRef, useState } from "react";

function ChatRoom() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const socket = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("No token found, cannot connect to WebSocket");
            return;
        }

        socket.current = new WebSocket(`ws://127.0.0.1:8000/chat?token=${token}`);

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages((prev) => [...prev, data]);
        };

        return () => socket.current.close();
    }, []);

    const sendMessage = () => {

        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
            return;
        }

        socket.current.send(input);

        setInput("");
    };

    return (
        <div>
            <div>
                {messages.map((msg, i) => (
                    <p key={i}>
                        <strong>{msg.username}:</strong> {msg.content}
                    </p>
                ))}
            </div>

            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default ChatRoom;