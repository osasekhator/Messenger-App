import React, { useState, useEffect } from "react";
import { useSocket } from "./SocketContext";
import ChatRoom from "./ChatRoom";
import NotificationSystem from "./NotificationSystem";
import "../stylesheets/ConvoBoard.css";

function ConvoBoard() {
    const [activeTab, setActiveTab] = useState("DMs");
    const [type, setType] = useState("DMs");

    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [participants, setParticipants] = useState([]);

    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [viewMode, setViewMode] = useState("convos");

    //const [notification, setNotification] = useState("");
    //const [notificationType, setNotificationType] = useState("");

    const [senderId, setSenderId] = useState(localStorage.getItem("sender_id"));
    //const senderId = localStorage.getItem("sender_id");
    const { socketRef } = useSocket();

    async function getConvos() {
        try {
            const senderId = localStorage.getItem("sender_id");
            if (!senderId) return;

            const response = await fetch("http://localhost:8000/getconversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: senderId, type: type }),
            });

            const data = await response.json();

            // safety: ensure array
            setConversations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    }

    async function createConvo(e) {
        e.preventDefault();

        try {
            const senderId = localStorage.getItem("sender_id");
            if (!senderId) return;

            const payload = {
                sender: senderId,
                participants: participants,
                type: type,
                name: name,
            };

            const response = await fetch("http://localhost:8000/conversations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setConversations((prev) => [...prev, data]);
                setName("");
                setParticipants([]);
                setCreating(false);
                console.log("Conversation created:", data);
                console.log("Creating:", creating)
            } else {
                console.error("Create convo failed:", data);
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
        }
    }

    useEffect(() => {
        getConvos();
        console.log(selectedConvo)
    }, [type]);

    useEffect(() => {
        if(!socketRef.current)
            return

        console.log("=== ConvoBoard effect running ===");
        console.log("socketRef.current:", socketRef.current);
        console.log("readyState:", socketRef.current.readyState);

        const handleIncomingMessage = (event) => {
            console.log("=== MESSAGE EVENT RECEIVED IN CONVOBOARD ===");
            const data = JSON.parse(event.data);
            console.log("Full parsed data:", data);
            console.log("data.conversation_id:", data.conversation_id);
            console.log("data.user_id:", data.user_id);
            console.log("senderId (mine):", senderId);
            console.log("selectedConvo:", selectedConvo);

            if(!data.conversation_id) {
                console.log("BLOCKED - no conversation_id");
                return
            }
            if(data.user_id === senderId) {
                console.log("BLOCKED - this is my own message");
                return
            }
            if(selectedConvo && data.conversation_id === selectedConvo._id) {
                console.log("BLOCKED - this is the currently open conversation");
                return
            }

            console.log("PASSED ALL CHECKS - marking unread:", data.conversation_id);

            //setNotification(`Just received a message from ${data.user_id}`);
            //setNotificationType("success");
            //<NotificationSystem message={notification} onClose={() => setNotification("")} type={notificationType}/>

            // mark this conversation as unread in local state
            setConversations((prev) =>
                prev.map((c) =>
                    c._id === data.conversation_id ? { ...c, unread: true } : c
                )
            );
        };

        socketRef.current.addEventListener("message", handleIncomingMessage);

        return() => {
            socketRef.current.removeEventListener("message", handleIncomingMessage)
        }
    }, [selectedConvo, senderId]);

    const handleClearUnread = (convId) => {
        setConversations((prev) =>
            prev.map((c) =>
                c._id === convId ? { ...c, unread: false } : c
            )
        );
    };

    return (
        <div className="convoBoard">
            {viewMode === "convos" && (
                <>
                {/* LEFT PANEL */}
                <div className="left_panel">
                    
                    <div>
                        <button onClick={() => { setActiveTab("DMs"); setType("DMs"); setSelectedConvo(null); }}>
                            DMs
                        </button>

                        <button onClick={() => { setActiveTab("Groups"); setType("Groups"); setSelectedConvo(null); }}>
                            Groups
                        </button>
                    </div>

                    <hr />

                    <h3>{activeTab}</h3>

                    {conversations.length === 0 ? (
                        <p>No conversations yet</p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {conversations.map((conv) => (
                                <li
                                    key={conv._id}
                                    onClick={() => {
                                        setSelectedConvo(conv);
                                        if(conv.unread) handleClearUnread(conv._id)
                                    }}
                                    style={{
                                        padding: "10px",
                                        cursor: "pointer",
                                        borderRadius: "5px",
                                        backgroundColor:
                                        selectedConvo?._id === conv._id ? "rgba(212, 209, 198, 0.6)" : "transparent",
                                    }}
                                >
                                    <span>{conv.display_name || conv.name}</span>
                                    {conv.unread && <span className="unreadDot"></span>}
                                </li>
                            ))}
                        </ul>
                    )}

                    <button onClick={() => setCreating(true)}>
                        New Conversation
                    </button>
                </div>

                {/* RIGHT PANEL (CHAT AREA) */}
                <div className="right_panel">
                    
                    {!selectedConvo ? (
                        <p>Select a conversation to start chatting</p>
                    ) : (
                        <div>
                            <h2 onClick={() => {setViewMode("details")}}>{selectedConvo.display_name || selectedConvo.name}</h2>

                            <div style={{
                                border: "1px solid #ccc",
                                borderRadius: "15px",
                                height: "80vh",
                                padding: "10px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column"
                            }}>
                                <ChatRoom conversation={selectedConvo} />
                            </div>
                        </div>
                    )}
                </div>

                {/* CREATE MODAL */}
                {creating && (
                    <div className="createModal">
                        <h3>Create Conversation</h3>

                        <form className="convoForm" onSubmit={createConvo}>
                            
                            {type === "Groups" && (
                                <>
                                    <input
                                        placeholder="Group name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                    <br />
                                </>
                            )}

                            <input
                                placeholder={
                                    type === "DMs"
                                        ? "Enter username"
                                        : "Enter usernames comma separated"
                                }
                                onChange={(e) =>
                                    setParticipants(
                                        type === "DMs"
                                            ? [e.target.value.trim()]
                                            : e.target.value.split(",").map(p => p.trim())
                                    )
                                }
                                required
                            />

                            <br /><br />

                            <button type="submit">Create</button>
                            <button type="button" onClick={() => setCreating(false)}>
                                Cancel
                            </button>
                        </form>
                    </div>
                )}
                </>
            )}

            {viewMode === "details" && (
                <div className="convoDetails">
                    <h2>{selectedConvo.display_name || selectedConvo.name}</h2>
                </div>
            )}
        </div>
    );
}

export default ConvoBoard;