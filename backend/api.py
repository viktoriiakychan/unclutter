from flask import Flask, jsonify
from dataclasses import asdict
from flask_cors import CORS

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)