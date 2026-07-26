from flask import Flask, jsonify
from dataclasses import asdict
from flask_cors import CORS
from gmail_client import GmailClient
from analytics import get_suggestions, get_total_email_count, get_unread_stats, get_category_breakdown, get_oldest_unread_days, get_cleaned_up_count, get_avg_emails_per_day

from flask import request

import database

app = Flask(__name__) # create the web application 
CORS(app)

database.create_table()
database.create_activity_table()

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
    return jsonify({"synced": len(emails)})

@app.route("/auth/me")
def get_logged_in_user():

    client = GmailClient()
    client.connect()

    profile = client.get_profile()
    return profile

@app.route("/unsubscribe-list")
def unsubscribe_list():
    client = GmailClient()
    client.connect()

    return client.get_unsubscribe_links()    


@app.route("/trash", methods=["POST"])
def trash_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    client = GmailClient()
    client.connect()

    client.trash(ids)
    database.delete_emails(ids)

    return jsonify({"trashed": len(ids)})

@app.route("/archive", methods=["POST"])
def archive_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    client = GmailClient()
    client.connect()

    client.archive(ids)
    database.mark_archived(ids)

    return jsonify({"archived": len(ids)})

# @app.route("/suggestions/top-offender")
# def top_offender():
#     emails = database.load_emails()
#     result = get_top_offender(emails)
#     return jsonify(result)

@app.route("/suggestions")
def suggestions():
    emails = database.load_emails()
    return jsonify(get_suggestions(emails))

@app.route("/activity")
def activity():
    activity = database.get_activity_log()
    return jsonify(activity)

@app.route("/untrash", methods=["POST"])
def untrash_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    client = GmailClient()
    client.connect()
    client.untrash(ids)

    database.restore_from_activity_log(ids)

    return jsonify({"untrashed": len(ids)})


@app.route("/unarchive", methods=["POST"])
def unarchive_emails():
    ids = request.get_json().get("ids")
    if not ids:
        return jsonify({"error": "no ids provided"}), 400

    client = GmailClient()
    client.connect()
    client.unarchive(ids)

    database.mark_unarchived(ids)

    return jsonify({"unarchived": len(ids)})

@app.route("/stats")
def get_stats():
    days = request.args.get("days", 30, type=int)
    
    conn = database.get_connection()
    unread_stats = get_unread_stats(conn)

    return jsonify({
        "totalEmails": get_total_email_count(conn, days),
        "unread": unread_stats["unread"],
        "read": unread_stats["read"],
        "percentageUnread": unread_stats["percentageUnread"],
        "percentageRead": unread_stats["percentageRead"],
        "cleanedUp": get_cleaned_up_count(conn, days),
        "categoriesStats": get_category_breakdown(conn, days),
        "oldestUnreadDays": get_oldest_unread_days(conn, days),
        "averageEmailsPerDay": get_avg_emails_per_day(conn, days),
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
