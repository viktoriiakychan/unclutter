import { API } from "./constants";

const post = (path, body) =>
    fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    
export async function unsubscribeFrom(sender_email) {
    const res = await post("/unsubscribe", { sender_email });
    const data = await res.json().catch(() => ({})); // a crashed backend may not send JSON

    if (!res.ok || (data.method !== "one_click" && data.method !== "link")) {
        throw new Error(data.method === "none" ? "no_link" : "failed");
    }

    if (data.method === "link") {
        window.open(data.url, "_blank", "noopener,noreferrer");
        await post("/dismiss-sender", { sender_email });
    }

    return data.method;
}

// the message to show the user for each outcome
export function unsubscribeMessage(method, name) {
    return method === "one_click"
        ? `Unsubscribed from ${name}`
        : `Opened ${name}'s unsubscribe page, finish there`;
}

export function unsubscribeError(err, name) {
    return err.message === "no_link"
        ? `${name} doesn't have an unsubscribe link we can use.`
        : "Couldn't unsubscribe right now, try again in a minute.";
}