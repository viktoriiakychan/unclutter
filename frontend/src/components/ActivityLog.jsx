import { useState, useEffect } from "react";
import { API } from "../utils/constants";


export default function Activity() {
    const [activityLog, setActivityLog] = useState([]);

    useEffect(() => {
            fetch(`${API}/activity`)
                .then((r) => r.json())
                .then((data) => setActivityLog(data));
        }, []);

    return (
    <div>
        <h1>Activity</h1>
        <ul>
        {activityLog.map((entry) => (
            <li key={entry.id}>
            {entry.action_type} — {entry.subject} ({entry.sender_name})
            </li>
        ))}
        </ul>
    </div>
    );    
}
