from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import base64
from email.mime.text import MIMEText

# reuse your existing token.json
creds = Credentials.from_authorized_user_file("token.json")
service = build("gmail", "v1", credentials=creds)

my_email = "vvkychan@gmail.com"

for i in range(23):
    message = MIMEText(f"This is test email #{i+1} for bulk delete testing.")
    message["to"] = my_email
    message["subject"] = "Test Cleanup Email"

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()
    print(f"Sent test email {i+1}/20")