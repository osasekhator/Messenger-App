import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketContext";
import "../stylesheets/ChatRoom.css";

function ChatRoom({ conversation }) {

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const textareaRef = useRef(null);
    const senderID = localStorage.getItem("sender_id");

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

    // helper function to format timestamps, to be used when rendering messages
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };

    // helper function to format date labels in the message history, e.g., "Today", "Yesterday", or specific date
    const formatDateLabel = (timestamp) => {
        const messageDate = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const isSameDay = (d1, d2) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();

        if (isSameDay(messageDate, today)) {
            return "Today";
        } else if (isSameDay(messageDate, yesterday)) {
            return "Yesterday";
        } else {
            return messageDate.toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
            });
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="messageArea">
                {messages.map((msg, i) => {
                    const isSender = msg.user_id === senderID;
                    const showDateSeparator = i === 0 || 
                    formatDateLabel(msg.timestamp) !== formatDateLabel(messages[i - 1].timestamp);

                    return (
                        <React.Fragment key= {i}>
                            {showDateSeparator && (
                                <div className="dateSeparator">
                                    <span>{formatDateLabel(msg.timestamp)}</span>
                                </div>
                            )}

                            <div className={`bubble ${isSender ? "sent" : "received"}`}>
                                {isSender && <strong className="senderName">You</strong>} 
                                {!isSender && <strong className="senderName">{msg.sender}</strong>}
                                <hr className="divider" />
                                <p className="messageContent">
                                    {msg.content}
                                </p>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                        </React.Fragment>
                    );
                })}
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
                        minWidth: "20%",
                        minHeight: "90%",
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