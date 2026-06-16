import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.utils import parseaddr
import time

from models import Email


class GmailClient:

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.modify"
    ]

    def __init__(self):
        self.creds = None
        self.service = None

    def connect(self):
        # buil the gmail service from a valid token. call after login exists

        creds = Credentials.from_authorized_user_file("token.json", self.SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open("token.json", "w") as f:
                f.write(creds.to_json())
        self.creds = creds
        self.service = build(
            "gmail", 
            "v1", 
            credentials=creds)    

    def check_if_logged_in(self):
        # is there a valid login right now ?
        if not os.path.exists("token.json"):
            return False

        creds = Credentials.from_authorized_user_file("token.json", self.SCOPES)

        # if token is valid - logged in    
        if creds.valid:
            return True

        # if token expired byt refreshable
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open("token.json", "w") as f:
                    f.write(creds.to_json())
                return True
            except Exception:
                return False

        # no token or expired with no refresh token        
        return False        

    def start_login(self):
        flow = InstalledAppFlow.from_client_secrets_file("credentials.json", self.SCOPES)
        creds = flow.run_local_server(port=0)

        with open("token.json", "w") as f:
            f.write(creds.to_json())
        
        return creds

    def attachment_stats(self, parts):
        count = 0
        total_size = 0

        if not parts:
            return count, total_size

        for part in parts:

            if part.get("filename"):
                count += 1
                total_size += part.get(
                    "body",
                    {}
                ).get(
                    "size",
                    0
                )

            c, s = self.attachment_stats(
                part.get("parts", [])
            )

            count += c
            total_size += s

        return count, total_size

    def get_emails(self, limit=100):
        # request gmail for you recent message ids
        # self.service = connection to gmail, knows how to talk to it
        # .users() -> users sectoion of gmail api
        # .messages() -> work with emails
        # .list(...) -> list the messges - userId="me" = logged-in user ...
        # execute - sends the request 

        # .list(...) e.g. .list(userId="me", maxResults=100) = give me a list of WHICH emails exist - ids 
        # .get(...) e.g. .get(userId="me", id=message["id"]) = give full detauls for a specific email id

        results = self.service.users().messages().list(
            userId="me",
            maxResults=limit
        ).execute()
        messages = results.get("messages", [])
        return self._fetch_full(messages) 


    def _fetch_full(self, messages):
        full_messages = {}

        def handle_response(request_id, response, exception):
            if exception is not None:
                if "429" not in str(exception):
                    print("Failed to fetch", request_id, exception)
                return
            full_messages[request_id] = response

        # send in smaller chunks 
        for i in range(0, len(messages), 5):
            chunk = messages[i:i+5]

            # create an empty batch 
            batch = self.service.new_batch_http_request(
                callback=handle_response # the results come back through here
            )

            # loops over 5 emails and adds the get request in the batch
            for message in chunk:
                batch.add(
                    self.service.users().messages().get(
                        userId="me",
                        id=message["id"]    
                    ),
                    request_id= message["id"]
                )
            batch.execute() # sends the batch to gmail to execute 
            time.sleep(0.2)

        emails = []

        for message in messages:
            msg = full_messages.get(message["id"])

            if msg is None:
                continue

            payload = msg.get(
                "payload",
                {}
            )

            headers = payload.get(
                "headers",
                []
            )

            sender = ""
            subject = ""
            date = ""
            is_newsletter = False
            unsubscribe = "" 

            for header in headers:

                if header["name"] == "From":
                    sender = header["value"]

                elif header["name"] == "Subject":
                    subject = header["value"]

                elif header["name"] == "Date":
                    date = header["value"]

                elif header["name"] == "List-Unsubscribe":
                    is_newsletter = True
                    unsubscribe = header["value"]

            attachment_count, attachment_size = (
                self.attachment_stats(
                    payload.get(
                        "parts",
                        []
                    )
                )
            )
            
            sender_name, sender_email = parseaddr(sender)

            labels = msg.get("labelIds", [])
            
            category = "other"

            if "CATEGORY_PROMOTIONS" in labels:
                category = "promotions"
            elif "CATEGORY_SOCIAL" in labels:
                category = "social"
            elif "CATEGORY_UPDATES" in labels:
                category = "updates"
            elif "CATEGORY_FORUMS" in labels:
                category = "forums"
            else:
                category = "other"       

            email = Email(
                id=msg["id"],
                thread_id=msg["threadId"],
                sender_name=sender_name,
                sender_email=sender_email,
                subject=subject,
                date=date,
                unread=("UNREAD" in labels),

                category=category,
                
                attachment_count=attachment_count,
                attachment_size=attachment_size,
                is_newsletter = is_newsletter,
                unsubscribe=unsubscribe, 
                internal_date=int(msg.get("internalDate", 0))
            )

            emails.append(email)

        return emails

    def mark_as_read(self, email_ids):
        for email_id in email_ids:
            self.service.users().messages().modify(
                userId="me",
                id=email_id,
                body={"removeLabelIds": ["UNREAD"]}
            ).execute()

        print(f"Marked {len(email_ids)} emails as read.")

    def archive(self, email_ids):
        for email_id in email_ids:
            self.service.users().messages().modify(
                userId="me",
                id=email_id,
                body={"removeLabelIds": ["INBOX"]}
            ).execute()

        print(f"Archived {len(email_ids)} emails.")

    def trash(self, email_ids):
        for email_id in email_ids:
            self.service.users().messages().trash(
                userId="me",
                id=email_id
            ).execute()

        print(f"Moved {len(email_ids)} emails to Trash.")

    def get_profile(self):
        profile = self.service.users().getProfile(userId="me").execute()

        return {"email": profile["emailAddress"]}

    def get_new_emails(self, existing_ids, limit=100):
        # get the recent message IDS!!! 
        results = self.service.users().messages().list(
            userId="me",
            maxResults=limit
        ).execute()
        messages = results.get("messages", []) # just acccess the messages 

        # keep only ids we dont already have 
        new_messages = [m for m in messages if m["id"] not in existing_ids]

        if not new_messages:
            return []

        return self._fetch_full(new_messages)
        