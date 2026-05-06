import React, { useEffect, useRef, useState } from "react";

function ChatRoom() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const socket = useRef(null);

    useEffect(() => {
        socket.current = new WebSocket("ws://127.0.0.1:8000/chat");

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

        const message = {
            sender: "Osas",
            content: input,
        };

        socket.current.send(JSON.stringify(message));

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
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default ChatRoom;