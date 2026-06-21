import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext";

function ChatRoom({ conversation }) {

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const textareaRef = useRef(null);

    const handleInputChange = (e) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

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
            console.log("LISTENER FIRED — message id:", data._id, "at", Date.now());
            console.log("Received:", data);

            setMessages((prev) => [...prev, data]);
        };

        console.log("ATTACHING listener for conversation:", conversation._id);
        socketRef.current.addEventListener("message", loadHistory); // listen for the next message to add to the history

        return() => {
            console.log("REMOVING listener for conversation:", conversation._id);
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
        if (textareaRef.current) {
            textareaRef.current.style.height = "36px";
        }
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

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "90%",
                    marginTop: "10%",
                }}
            >
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: "36px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        borderWidth: "0px",
                        boxSizing: "border-box",
                        margin: 0,
                        resize: "none",
                        overflow: "hidden",
                    }}
                />

                <button
                    onClick={sendMessage}
                    style={{
                        width: "20%",
                        minWidth: "80px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        height: "36px",
                        boxSizing: "border-box",
                        margin: 0,
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}

export default ChatRoom;