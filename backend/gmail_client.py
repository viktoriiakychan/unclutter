import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.utils import parseaddr
import time
from database import load_emails
import re
from analytics import get_unsubscribe_link
from googleapiclient.errors import HttpError
import httplib2

from models import Email


class GmailClient:

    SCOPES = [
        "https://www.googleapis.com/auth/gmail.modify"
    ]

    UNITS_PER_SECOND = 90
    BATCH_SIZE = 10
    METADATA_COST = 20
    FULL_COST = 60
    HEADERS = ["From", "Subject", "Date", "List-Unsubscribe", "List-Unsubscribe-Post"]

    def __init__(self):
        self.creds = None
        self.service = None

    def connect(self):
        # buil the gmail service from a valid token. call after login exists
        if not os.path.exists("token.json"):
            raise RuntimeError("not_logged_in")
        
        creds = Credentials.from_authorized_user_file("token.json", self.SCOPES)
        if not creds.valid:
            if not creds.refresh_token:
                raise RuntimeError("not_logged_in")
            try:
                creds.refresh(Request())
            except RefreshError:
                # token is dead (7-day expiry or revoked), delete it so we show login
                os.remove("token.json")
                raise RuntimeError("not_logged_in")
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
                os.remove("token.json")
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

    def list_all_message_ids(self, days=None, should_stop=None, extra_query=None):
        message_ids = []
        page_token = None
        retries = 0
        # e.g. "newer_than:30d has:attachment"
        parts = [f"newer_than:{days}d"] if days else []
        if extra_query:
            parts.append(extra_query)
        query = " ".join(parts) or None

        while True:
            if should_stop and should_stop():
                return []  # sync was cancelled (e.g. logout)
            try:
                results = self.service.users().messages().list(
                    userId="me",
                    labelIds=["INBOX"],
                    q=query,
                    maxResults=500,
                    pageToken=page_token
                ).execute()
            except Exception as e:
                if "rateLimitExceeded" in str(e) and retries < 5:
                    retries += 1
                    print(f"Rate limited on list, backing off 60s (attempt {retries}/5)")
                    # sleep in small steps so a logout doesn't have to wait a full minute
                    for _ in range(60):
                        if should_stop and should_stop():
                            return []
                        time.sleep(1)
                    continue  # retry the same page
                raise

            message_ids.extend(results.get("messages", []))
            page_token = results.get("nextPageToken")

            if not page_token:
                break

            time.sleep(1)

        return message_ids

    def _parse_message(self, msg):
        payload = msg.get("payload", {})
        headers = payload.get("headers", [])

        sender = subject = date = unsubscribe = ""
        is_newsletter = False
        one_click = False  

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
            elif header["name"].lower() == "list-unsubscribe-post":
                one_click = "one-click" in header["value"].lower() 

        attachment_count, attachment_size = self.attachment_stats(payload.get("parts", []))
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

        return Email(
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
            is_newsletter=is_newsletter,
            unsubscribe=unsubscribe,
            internal_date=int(msg.get("internalDate", 0)),
            one_click=one_click
        )

    def _save_attachments_from_payload(self, email_id, parts):
        import database
        conn = database.get_connection()
        self._collect_attachments(parts, email_id, conn)
        conn.commit()
        conn.close()

    def _fetch_full(self, messages, on_progress=None, on_batch=None, should_stop=None, full_ids=None):
        full_messages = {}
        rate_limited = set()  # ids Gmail said "slow down" for, in the current batch

        first_error = []  # only print one, otherwise it floods the terminal

        def handle_response(request_id, response, exception):
            if exception is not None:
                if not first_error:
                    first_error.append(True)
                    print("First Gmail error:", exception)
                server_error = isinstance(exception, HttpError) and exception.resp.status >= 500
                if "rateLimitExceeded" in str(exception) or "429" in str(exception) or server_error:
                    rate_limited.add(request_id)  # worth trying again later
                else:
                    print("Failed to fetch", request_id, exception)  # e.g. deleted since we listed it
                return
            full_messages[request_id] = response

        queue = [m["id"] for m in messages]  
        attempts = {}                       
        gave_up = []
        all_emails = []
        slowdown = 1.0                       

        while queue:
            if should_stop and should_stop():
                break

            chunk, queue = queue[:self.BATCH_SIZE], queue[self.BATCH_SIZE:]
            rate_limited.clear()

            batch = self.service.new_batch_http_request(callback=handle_response)
            batch_cost = 0  # quota units this batch will use
            for msg_id in chunk:
                # if no
                if full_ids is None or msg_id in full_ids:
                    # has attachments: need the full email to see the attachment names and sizes
                    request = self.service.users().messages().get(userId="me", id=msg_id, format="full")
                    batch_cost += self.FULL_COST
                else:
                    # no attachments: headers are all we need, and it's 3x cheaper
                    request = self.service.users().messages().get(
                        userId="me", id=msg_id, format="metadata", metadataHeaders=self.HEADERS
                    )
                    batch_cost += self.METADATA_COST
                batch.add(request, request_id=msg_id)

            started = time.monotonic()
            try:
                batch.execute()
            except (OSError, httplib2.HttpLib2Error) as e:
                print(f"Network error, retrying this batch later: {e}")
                rate_limited.update(m for m in chunk if m not in full_messages)
            elapsed = time.monotonic() - started

            for msg_id in rate_limited:
                attempts[msg_id] = attempts.get(msg_id, 0) + 1
                if attempts[msg_id] < 5:
                    queue.append(msg_id)
                else:
                    gave_up.append(msg_id)

            if rate_limited:
                slowdown = min(slowdown * 2, 8)      
                print(f"Rate limited ({len(rate_limited)}/{len(chunk)}), slowing down x{slowdown:.1f}")
            else:
                slowdown = max(slowdown * 0.9, 1.0)  # all good: speed back up a little

            # wait long enough that we spend at most UNITS_PER_SECOND. e.g. 200 units / 90 = ~2.2s
            wait = batch_cost / self.UNITS_PER_SECOND * slowdown
            time.sleep(max(0, wait - elapsed))

            if should_stop and should_stop():
                print("Sync cancelled, discarding this batch")
                break

            batch_emails = []
            for msg_id in chunk:
                if msg_id not in full_messages:
                    continue
                msg = full_messages.pop(msg_id)  # pop = free the memory, we don't need the raw email after this
                email = self._parse_message(msg)
                batch_emails.append(email)
                if email.attachment_count >= 1:
                    self._save_attachments_from_payload(email.id, msg.get("payload", {}).get("parts", []))

            all_emails.extend(batch_emails)
            if on_batch and batch_emails:
                on_batch(batch_emails)
            if on_progress:
                on_progress(len(all_emails))

        if gave_up:
            print(f"Gave up on {len(gave_up)} emails after 5 rate limits each")

        return all_emails

    def get_all_emails(self, on_progress=None):
        message_ids=self.list_all_message_ids()
        return self._fetch_full(message_ids, on_progress=on_progress)

    def _batch_modify(self, email_ids, add=None, remove=None):
        # Gmail allows max 1000 ids per batchModify call, so split into chunks
        for i in range(0, len(email_ids), 1000):
            body = {"ids": email_ids[i:i + 1000]}
            if add:
                body["addLabelIds"] = add
            if remove:
                body["removeLabelIds"] = remove

            self.service.users().messages().batchModify(
                userId="me", body=body
            ).execute(num_retries=5)


    def mark_as_read(self, email_ids):
        self._batch_modify(email_ids, remove=["UNREAD"])
        print(f"Marked {len(email_ids)} emails as read.")

    def archive(self, email_ids):
        self._batch_modify(email_ids, remove=["INBOX"])
        print(f"Archived {len(email_ids)} emails.")

    def trash(self, email_ids):
        self._batch_modify(email_ids, add=["TRASH"])
        print(f"Moved {len(email_ids)} emails to Trash.")

    def untrash(self, email_ids):
        self._batch_modify(email_ids, add=["INBOX"], remove=["TRASH"])
        print(f"Moved {len(email_ids)} emails from Trash.")

    def unarchive(self, email_ids):
        self._batch_modify(email_ids, add=["INBOX"])
        print(f"Unarchived {len(email_ids)} emails.")

    # def mark_as_unread(self, email_ids):
    #     self._batch_modify(email_ids, add=["UNREAD"])
    #     print(f"Marked {len(email_ids)} emails as unread.")

    def get_profile(self):
        profile = self.service.users().getProfile(userId="me").execute()
        return {"email": profile["emailAddress"], "historyId": profile["historyId"]}

    def get_message_count(self):
        profile = self.service.users().getProfile(userId="me").execute()
        return profile.get("messagesTotal", 0)

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


    def get_unsubscribe_links(self, limit=100):
        emails = load_emails()
        result = []
        seen = set()

        for email in emails:
            if email.is_newsletter and email.sender_email not in seen:
                seen.add(email.sender_email)

                # count every email from this same sender + find their latest email date
                sender_emails = [e for e in emails if e.sender_email == email.sender_email]
                count = len(sender_emails)
                latest_date = max(e.internal_date for e in sender_emails)

                result.append({
                    "sender_name": email.sender_name,
                    "sender_email": email.sender_email,
                    "unsubscribe": get_unsubscribe_link(email.unsubscribe),
                    "count": count,
                    "latest_email_date": latest_date,
                })

        return result

    def get_recent_emails(self, limit=100):
        results = self.service.users().messages().list(
            userId="me",
            maxResults=limit
        ).execute()
        messages = results.get("messages", [])
        if not messages:
            return []
        return self._fetch_full(messages)
    
    def _collect_attachments(self, parts, email_id, conn):
        if not parts:
            return

        for part in parts:
            filename = part.get("filename")
            if filename:
                mime_type = part.get("mimeType", "")
                size = part.get("body", {}).get("size", 0)
                conn.execute(
                    "INSERT OR IGNORE INTO attachments (email_id, filename, mime_type, size_bytes) VALUES (?, ?, ?, ?)",
                    (email_id, filename, mime_type, size)
                )

            self._collect_attachments(part.get("parts", []), email_id, conn)

    def sync_attachments(self, email_id):
        import database
        try:
            msg = self.service.users().messages().get(
                userId="me", id=email_id, format="full"
            ).execute()
        except Exception as e:
            if "rateLimitExceeded" in str(e):
                print(f"Rate limited on attachment sync for {email_id}, skipping")
                return
            raise

        payload = msg.get("payload", {})
        conn = database.get_connection()
        self._collect_attachments(payload.get("parts", []), email_id, conn)
        conn.commit()
        conn.close()

    def get_history(self, start_history_id):
        changes = {"added": [], "deleted": [], "labels_added": [], "labels_removed": []}
        page_token = None
        new_history_id = start_history_id

        while True:
            results = self.service.users().history().list(
                userId="me",
                startHistoryId=start_history_id,
                pageToken=page_token
            ).execute()

            for record in results.get("history", []):
                changes["added"].extend(record.get("messagesAdded", []))
                changes["deleted"].extend(record.get("messagesDeleted", []))
                changes["labels_added"].extend(record.get("labelsAdded", []))
                changes["labels_removed"].extend(record.get("labelsRemoved", []))

            if "historyId" in results:
                new_history_id = results["historyId"]

            page_token = results.get("nextPageToken")
            if not page_token:
                break

        return changes, new_history_id

    def get_current_labels(self, ids):
        labels = {} # dict -> {id: [labelIds]}
        gone = []
        failed = []

        def handle(request_id, response, exception):
            if exception is not None:
                if isinstance(exception, HttpError) and exception.resp.status == 404:
                    gone.append(request_id)
                else:
                    failed.append(request_id)
                return
            labels[request_id] = response.get("labelIds", [])

        for i in range(0, len(ids), 25): # sends requests in batches of 25
            chunk = ids[i:i + 25]
            batch = self.service.new_batch_http_request(callback=handle) # make an empty placeholder that would hold up to 25 requests & when result comes back call handle for each one 
            # for each message in batch put it in the placeholder 
            for msg_id in chunk:
                # no .execute after .get because the request is just build here not sent
                batch.add(
                    self.service.users().messages().get(userId="me", id=msg_id, format="minimal"), # minimal cos it returns only id and labelids
                    request_id=msg_id, #label each request for handle
                )
            batch.execute() # send the batch to gmail as one HTTP call 
            time.sleep(1) # wait before next chunk

        if failed: # raising means history_id never updates
            # crash on purpose so history_id doesn't move forward, next sync retries these
            raise RuntimeError(f"couldn't get labels for {len(failed)} emails, will retry next sync")

        return labels, gone

    def get_inbox_count(self):
        # exact number of emails in the inbox (not the whole mailbox)
        label = self.service.users().labels().get(userId="me", id="INBOX").execute()
        return label.get("messagesTotal", 0)

    def count_messages(self, query, cap):
        # count matching inbox emails by listing their ids, stop once we pass the cap
        count = 0
        page_token = None
        while True:
            results = self.service.users().messages().list(
                userId="me",
                labelIds=["INBOX"],
                q=query,
                maxResults=500,
                pageToken=page_token,
                fields="messages/id,nextPageToken",   # only send back ids, keeps it light
            ).execute()

            count += len(results.get("messages", []))
            page_token = results.get("nextPageToken")
            if not page_token or count >= cap:
                return min(count, cap)

    def get_range_estimates(self, day_options, cap=2000):
        counts = {}
        hit_cap = False

        for days in sorted(day_options):          # smallest range first
            if hit_cap:
                counts[str(days)] = cap           # bigger ranges contain the smaller one
                continue
            counts[str(days)] = self.count_messages(f"newer_than:{days}d", cap)
            hit_cap = counts[str(days)] >= cap

        counts["all"] = self.get_inbox_count()    # exact, from the INBOX label
        counts["cap"] = cap                       # so the frontend knows when to show "2,000+"
        return counts

    def get_display_name(self):
        # 1. the name you send emails as (Gmail settings > Accounts > Send mail as)
        send_as = self.service.users().settings().sendAs().list(userId="me").execute()
        for alias in send_as.get("sendAs", []):
            if alias.get("isPrimary") and alias.get("displayName"):
                return alias["displayName"]

        # 2. fallback: the name on most recent sent email
        sent = self.service.users().messages().list(userId="me", q="in:sent", maxResults=1).execute()
        for m in sent.get("messages", []):
            msg = self.service.users().messages().get(
                userId="me", id=m["id"], format="metadata", metadataHeaders=["From"]
            ).execute()
            for header in msg.get("payload", {}).get("headers", []):
                if header["name"] == "From":
                    name, _ = parseaddr(header["value"])   # "Viktoriia Kychan <v@gmail.com>" → "Viktoriia Kychan"
                    if name:
                        return name

        return None