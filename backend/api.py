from flask import Flask, jsonify
from dataclasses import asdict
from flask_cors import CORS
from gmail_client import GmailClient
import analytics as an

from flask import request
import database
import threading

import os

app = Flask(__name__) # create the web application 
CORS(app)

database.create_table()
database.create_activity_table()
database.create_dismissed_senders_table()
database.create_sync_state_table()

sync_progress = {"synced": 0, "total": 0, "running": False, "type": None}
sync_cancelled = threading.Event()

@app.route("/emails") # when someone visits /emails run this function 
def get_emails():
    emails = database.load_emails()

    # turn each Email object into a dict so it can become JSON
    emails_as_dicts = [asdict(e) for e in emails]

    return jsonify(emails_as_dicts)


@app.route("/auth/status")
def auth_status():
    client = GmailClient.__new__(GmailClient)
    # check if a valid login already exists
    logged_in = client.check_if_logged_in() # reads token.json
    return jsonify({"logged_in": logged_in})

@app.route("/auth/login", methods=["POST"])
def auth_login():
    client = GmailClient.__new__(GmailClient)
    # check if a valid login already exists
    client.start_login() # trigger oauth
    return jsonify({"status": "login started"})

@app.route("/sync", methods=["POST"])
def sync():
    client = GmailClient()
    if not client.check_if_logged_in():
        return jsonify({"error": "not_logged_in"}), 401
    client.connect()

    emails = client.get_recent_emails()
    database.save_emails(emails)

    conn = database.get_connection()
    for email in emails:
        if email.attachment_count >= 1:
            client.sync_attachments(conn, email.id)
    conn.close()

    return jsonify({"synced": len(emails)})

@app.route("/auth/me")
def get_logged_in_user():
    try:
        client = GmailClient()
        client.connect()
        profile = client.get_profile()
        return profile
    except Exception as e:
        return jsonify({"error": str(e)}), 401

@app.route("/unsubscribe-list")
def unsubscribe_list():
    try:
        client = GmailClient()
        client.connect()
    except RuntimeError:
        return jsonify([])

    raw_list = client.get_unsubscribe_links()

    conn = database.get_connection()
    dismissed_map = an.get_dismissed_senders(conn)
    conn.close()

    filtered_list = []
    for item in raw_list:
        sender_email = item["sender_email"]
        if sender_email in dismissed_map:
            dismissed_snapshot_date = dismissed_map[sender_email]
            if item["latest_email_date"] <= dismissed_snapshot_date:
                continue  # still dismissed, nothing new since
        filtered_list.append(item)

    return jsonify(filtered_list)


@app.route("/trash", methods=["POST"])
def trash_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    try:
        client = GmailClient()
        client.connect()
    except RuntimeError:
        return jsonify({"error": "not_logged_in"}), 401

    client.trash(ids)
    database.delete_emails(ids)

    return jsonify({"trashed": len(ids)})

@app.route("/archive", methods=["POST"])
def archive_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    try:
        client = GmailClient()
        client.connect()
    except RuntimeError:
        return jsonify({"error": "not_logged_in"}), 401

    client.archive(ids)
    database.mark_archived(ids)

    return jsonify({"archived": len(ids)})

# @app.route("/suggestions/top-offender")
# def top_offender():
#     emails = database.load_emails()
#     result = an.get_top_offender(emails)
#     return jsonify(result)

@app.route("/suggestions")
def suggestions():
    emails = database.load_emails()
    return jsonify(an.get_suggestions(emails))

@app.route("/activity")
def activity():
    activity = database.get_activity_log()
    return jsonify(activity)

@app.route("/untrash", methods=["POST"])
def untrash_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    try:
        client = GmailClient()
        client.connect()
    except RuntimeError:
        return jsonify({"error": "not_logged_in"}), 401

    client.untrash(ids)

    database.restore_from_activity_log(ids)

    return jsonify({"untrashed": len(ids)})


@app.route("/unarchive", methods=["POST"])
def unarchive_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    try:
        client = GmailClient()
        client.connect()
    except RuntimeError:
        return jsonify({"error": "not_logged_in"}), 401

    client.unarchive(ids)

    database.mark_unarchived(ids)

    return jsonify({"unarchived": len(ids)})

@app.route("/stats")
def get_stats():
    days = request.args.get("days", 30, type=int)
    
    conn = database.get_connection()
    unread_stats = an.get_unread_stats(conn, days)

    return jsonify({
        "totalEmails": an.get_total_email_count(conn, days),
        "unread": unread_stats["unread"],
        "read": unread_stats["read"],
        "percentageUnread": unread_stats["percentageUnread"],
        "percentageRead": unread_stats["percentageRead"],
        "cleanedUp": an.get_cleaned_up_count(conn, days),
        "categoriesStats": an.get_category_breakdown(conn, days),
        "oldestUnreadDays": an.get_oldest_unread_days(conn, days),
        "averageEmailsPerDay": an.get_avg_emails_per_day(conn, days),
        "heatmap": an.get_email_heatmap(conn, days),
        "emailVolume": an.email_volume_stats(conn, days),
        "emailsWithAttachment": an.get_num_emails_with_attachment(conn, days),
        "totalAttachmentSize": an.get_total_attachment_size(conn, days),
        "largestAttachments": an.get_largest_attachment_list(conn, days),
        "attachmentBreakdown": an.get_attachment_type_breakdown(conn, days)
    })

@app.route("/noise-scores")
def get_noise_scores():
    conn = database.get_connection()

    scores = an.get_sender_noise_scores(conn)
    return jsonify(scores)

@app.route("/health-score")
def get_health_score():
    conn = database.get_connection()
    
    scores = an.get_inbox_health_score(conn)
    return jsonify(scores)

@app.route("/worst-offender")
def worst_offender():
    conn = database.get_connection()
    return jsonify(an.get_worst_offender(conn))


@app.route("/dismiss-sender", methods=["POST"])
def dismiss_sender():
    sender_email = request.get_json().get("sender_email")

    conn = database.get_connection()
    cursor = conn.cursor()

    # find their most recent email right now
    row = cursor.execute(
        "SELECT MAX(internal_date) FROM emails WHERE sender_email = ?",
        (sender_email,)
    ).fetchone()
    latest_date = row[0]

    cursor.execute("""
        INSERT INTO dismissed_senders (sender_email, last_seen_email_date)
        VALUES (?, ?)
        ON CONFLICT(sender_email) DO UPDATE SET
            dismissed_at = CURRENT_TIMESTAMP,
            last_seen_email_date = excluded.last_seen_email_date
    """, (sender_email, latest_date))

    conn.commit()
    conn.close()
    return jsonify({"dismissed": True})


@app.route("/categories", methods=["GET"])
def get_categories():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, color, created_at FROM categories")
    rows = cursor.fetchall()
    conn.close()

    categories = [
        {"id": r[0], "name": r[1], "description": r[2], "color": r[3], "created_at": r[4]}
        for r in rows
    ]
    return jsonify(categories)


@app.route("/categories", methods=["POST"])
def create_category():
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")
    color = data.get("color")

    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO categories (name, description, color) VALUES (?, ?, ?)",
        (name, description, color),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({"id": new_id, "name": name, "description": description, "color": color}), 201


@app.route("/categories/<int:category_id>", methods=["PUT"])
def update_category(category_id):
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")
    color = data.get("color")

    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?",
        (name, description, color, category_id),
    )
    conn.commit()
    conn.close()

    return jsonify({"id": category_id, "name": name, "description": description, "color": color})


@app.route("/categories/<int:category_id>", methods=["DELETE"])
def delete_category(category_id):
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()

    return jsonify({"deleted": category_id})

from googleapiclient.errors import HttpError

@app.route("/sync-range")
def get_sync_range():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM sync_state WHERE key = 'sync_days'")
    row = cursor.fetchone()
    conn.close()

    if row and row[0] != "None":
        return jsonify({"days": int(row[0])})
    return jsonify({"days": None})

def background_sync(sync_days=None):
    global sync_progress
    sync_cancelled.clear()
    sync_progress["running"] = True
    sync_progress["synced"] = 0
    sync_progress["total"] = 0 

    conn = None
    try:
        conn = database.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM sync_state WHERE key = 'history_id'")
        row = cursor.fetchone()

        client = GmailClient()
        client.connect()

        needs_full_sync = row is None

        if not needs_full_sync:
            sync_progress["type"] = "incremental"
            try:
                changes, new_history_id = client.get_history(row[0])

                for item in changes["deleted"]:
                    database.delete_emails([item["message"]["id"]])

                for item in changes["added"]:
                    email_objs = client._fetch_full([item["message"]])
                    database.save_emails(email_objs)
                    for email in email_objs:
                        if email.attachment_count >= 1:
                            client.sync_attachments(conn, email.id)

                for item in changes["labels_added"]:
                    label_ids = item.get("labelIds", [])
                    msg_id = item["message"]["id"]

                    if "UNREAD" in label_ids:
                        cursor.execute("UPDATE emails SET unread = 1 WHERE id = ?", (msg_id,))

                    if "TRASH" in label_ids:
                        database.delete_emails([msg_id])

                    if "INBOX" in label_ids:
                        cursor.execute("SELECT id FROM emails WHERE id = ?", (msg_id,))
                        exists = cursor.fetchone()

                        if exists:
                            database.mark_unarchived([msg_id])
                        else:
                            restored = client._fetch_full([{"id": msg_id}])
                            if restored:
                                database.save_emails(restored)
                                for email in restored:
                                    if email.attachment_count >= 1:
                                        client.sync_attachments(conn, email.id)

                for item in changes["labels_removed"]:
                    label_ids = item.get("labelIds", [])
                    msg_id = item["message"]["id"]
                    if "UNREAD" in label_ids:
                        cursor.execute("UPDATE emails SET unread = 0 WHERE id = ?", (msg_id,))
                    if "INBOX" in label_ids:
                        database.mark_archived([msg_id])

                cursor.execute(
                    "UPDATE sync_state SET value = ? WHERE key = 'history_id'",
                    (new_history_id,)
                )
                sync_progress["total"] = (
                    len(changes["added"]) + len(changes["deleted"])
                    + len(changes["labels_added"]) + len(changes["labels_removed"])
                )
                sync_progress["synced"] = sync_progress["total"]

            except HttpError as e:
                print("Stale history_id, falling back to full sync:", e)
                needs_full_sync = True

        if needs_full_sync:
            sync_progress["type"] = "full"
            message_stubs = client.list_all_message_ids(days=sync_days)
            sync_progress["total"] = len(message_stubs)

            def update_progress(count):
                sync_progress["synced"] = count

            def save_batch(batch):
                if sync_cancelled.is_set():
                    return
                database.save_emails(batch)
                for email in batch:
                    if email.attachment_count >= 1:
                        client.sync_attachments(conn, email.id)

            emails = client._fetch_full(
                message_stubs,
                on_progress=update_progress,
                on_batch=save_batch,
                should_stop=lambda: sync_cancelled.is_set()
            )

            if sync_cancelled.is_set():
                print("Sync was cancelled — skipping history checkpoint")
                return

            profile = client.get_profile()
            cursor.execute("DELETE FROM sync_state WHERE key = 'history_id'")
            cursor.execute(
                "INSERT INTO sync_state (key, value) VALUES ('history_id', ?)",
                (profile["historyId"],)
            )

        conn.commit()

    except Exception as e:
        print("background_sync failed:", e)
        if conn:
            conn.rollback()

    finally:
        if conn:
            conn.close()
        sync_progress["running"] = False

@app.route("/sync/start", methods=["POST"])
def start_sync():
    if sync_progress["running"]:
        return jsonify({"error": "already running"}), 409

    body = request.get_json(silent=True) or {}
    conn = database.get_connection()
    cursor = conn.cursor()

    if "days" in body:
        raw_days = body.get("days")
        sync_days = None if raw_days in (None, "all") else int(raw_days)
        cursor.execute(
            "INSERT INTO sync_state (key, value) VALUES ('sync_days', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(sync_days),)
        )
        conn.commit()
    else:
        cursor.execute("SELECT value FROM sync_state WHERE key = 'sync_days'")
        row = cursor.fetchone()
        sync_days = int(row[0]) if row and row[0] != "None" else None

    conn.close()

    threading.Thread(target=background_sync, args=(sync_days,)).start()
    return jsonify({"started": True})

@app.route("/sync/progress")
def get_sync_progress():
    return jsonify(sync_progress)

@app.route("/auth/logout", methods=["POST"])
def auth_logout():
    sync_cancelled.set()
    sync_progress["running"] = False
    sync_progress["synced"] = 0
    sync_progress["total"] = 0
    sync_progress["type"] = None

    if os.path.exists("token.json"):
        os.remove("token.json")

    database.clear_all_local_data()

    return jsonify({"logged_out": True})

@app.route("/message-count")
def message_count():
    try:
        client = GmailClient()
        client.connect()
        count = client.get_message_count()
        return jsonify({"count": count})
    except RuntimeError:
        return jsonify({"count": None})

if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)