import React, { useState, useEffect } from "react";
import ChatRoom from "./ChatRoom";
import "../stylesheets/ConvoBoard.css";

function ConvoBoard() {
    const [activeTab, setActiveTab] = useState("DMs");
    const [type, setType] = useState("DMs");

    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [participants, setParticipants] = useState([]);

    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);

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

    return (
        <div className="convoBoard">
            
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
                                onClick={() => setSelectedConvo(conv)}
                                style={{
                                    padding: "10px",
                                    cursor: "pointer",
                                    borderRadius: "5px",
                                    backgroundColor:
                                    selectedConvo?._id === conv._id ? "rgb(212, 209, 198)" : "transparent",
                                }}
                            >
                                {conv.display_name || conv.name}
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
                        <h2>{selectedConvo.display_name || selectedConvo.name}</h2>

                        <div style={{
                            border: "1px solid #ccc",
                            height: "80vh",
                            padding: "10px",
                            overflowY: "auto"
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
        </div>
    );
}

export default ConvoBoard;