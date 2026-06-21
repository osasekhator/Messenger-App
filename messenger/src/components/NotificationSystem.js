import React, { useEffect, useState } from "react";
import "./NotificationSystem.css";

function NotificationSystem({ message, onClose, type = "info", duration = 4000 }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), duration);
        return () => clearTimeout(timer);
    }, [message, duration]);

    // call onClose after hide animation completes
    useEffect(() => {
        if (!visible && message) {
            const t = setTimeout(() => {
                onClose && onClose();
            }, 260);
            return () => clearTimeout(t);
        }
    }, [visible, message, onClose]);

    if (!message) return null;

    // this string works by applying a base class for styling, a modifier class for the type (success, error, etc), and a "visible" class to trigger the CSS transition
    const className = `toast toast--${type} ${visible ? "visible" : ""}`;

    return (
        <div className={className}>
            <div className="toast__content">
                <p className="toast__message">{message}</p>
            </div>
        </div>
    );
}

export default NotificationSystem;