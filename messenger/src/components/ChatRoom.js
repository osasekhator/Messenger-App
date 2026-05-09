import React, { useEffect, useRef, useState } from "react";

function ChatRoom({ conversation }) {

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const socket = useRef(null);

    useEffect(() => {

        if (!conversation) return;

        const token = localStorage.getItem("token");

        if (!token) {
            console.error("No token found");
            return;
        }

        // clear old messages when switching chats
        setMessages([]);

        socket.current = new WebSocket(
            `ws://127.0.0.1:8000/chat/${conversation._id}?token=${token}`
        );

        socket.current.onopen = () => {
            console.log("Connected to websocket");
        };

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            console.log("Received:", data);

            setMessages((prev) => [...prev, data]);
        };

        socket.current.onclose = () => {
            console.log("Websocket disconnected");
        };

        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };

    }, [conversation]);

    const sendMessage = () => {

        if (!input.trim()) return;

        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
            console.error("Socket not connected");
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