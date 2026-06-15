from flask import Flask, jsonify
from dataclasses import asdict
from flask_cors import CORS
from gmail_client import GmailClient

import database

app = Flask(__name__) # create the web application 
CORS(app)


@app.route("/emails") # when someone visits /emails run this function 
def get_emails():
    database.create_table()
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
    emails = client.get_emails()
    database.create_table()
    database.clear_emails()
    database.save_emails(emails)
    return jsonify({"synced": len(emails)})

if __name__ == "__main__":
    app.run(debug=True, port=5000)