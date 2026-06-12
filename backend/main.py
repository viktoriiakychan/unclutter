from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from gmail_client import GmailClient
import analytics
import database

MAX_EMAIL = 50

def sync(gmail):
    fetched = gmail.get_emails(MAX_EMAIL)
    database.clear_emails() 
    database.save_emails(fetched)
    return database.load_emails()

def confirm_and_trash(gmail, emails_to_trash):
    if not emails_to_trash:
        print("Nothing to trash.")
        return False

    print(f"\nThe following {len(emails_to_trash)} emails will be moved to Trash:")
    for e in emails_to_trash:
        print(f"  - {e.sender_name}: {e.subject}")

    confirm = input("\nTrash these? Type 'yes' to confirm: ")

    if confirm.lower() == "yes":
        ids = [e.id for e in emails_to_trash]
        gmail.trash(ids)
        return True
    else:
        print("Cancelled. Nothing was trashed.")
        return False

def show_newsletter_count(emails):
    newsletter_count = analytics.get_newsletter_counts(emails)
    for sender, count in newsletter_count.most_common():
        print(sender, count)  

def read_emails(gmail, emails):
    unread_count = analytics.get_unread_emails(emails)
    print("Unread count:", unread_count)

    newsletter_ids = [e.id for e in emails if e.is_newsletter]
    gmail.mark_as_read(newsletter_ids)

    emails = sync(gmail)

    unread_count = analytics.get_unread_emails(emails)
    print("Unread count:", unread_count)

    return emails

def archive_emails(gmail, emails):
    newsletter_ids = [e.id for e in emails if e.is_newsletter]
    gmail.archive(newsletter_ids)   
    return sync(gmail)

def trash_emails(gmail, emails):
    to_trash = [e for e in emails if e.is_newsletter]

    if confirm_and_trash(gmail, to_trash):
        emails = sync(gmail)
    return emails

def clean_up_by_sender(gmail, emails):
        sender_counts = analytics.get_sender_counts(emails)

        # print the senders and the number of emails from them in descending order
        print()
        sender_num = 1
        senders = sender_counts.most_common()
        for sender, count in senders:
            print(f"{sender_num}. {sender}: {count}")
            sender_num+=1

        raw = input("Enter the number of sender you want to work with: ")

        if not raw.isdigit():
            print("That's not a number. Try again.")
            return emails   

        num = int(raw)
        
        if num < 1 or num > len(senders):
            print("That number isn't in the list. Try again.")
            return emails

        curr_sender = senders[num-1]
        curr_sender_email = senders[num-1][0]
        print("\nWorking with", curr_sender[0])

        print("Select what you would like to do with the emails from this sender:\n")
        print("1. Read")
        print("2. Archive")
        print("3. Trash")
        print("4. Back")

        raw_action = input("\nChoose an action: ")

        if raw_action not in ("1", "2", "3", "4"):
            print("Invalid action. Try again.")
            return emails

        if raw_action == "4":
            return emails   

        action = int(raw_action)

        curr_sender_emails = [e for e in emails if e.sender_email == curr_sender_email]

        if action == 1:
            ids = [e.id for e in curr_sender_emails]
            gmail.mark_as_read(ids)
            emails = sync(gmail)

        elif action == 2:
            ids = [e.id for e in curr_sender_emails]
            gmail.archive(ids)
            emails = sync(gmail)


        elif action == 3:
            if confirm_and_trash(gmail, curr_sender_emails):
                emails = sync(gmail)

        return emails

def get_unsubscribe_links(emails):
    seen_senders = set()
    for e in emails:
        if e.is_newsletter:
            if e.sender_email in seen_senders:
                continue
            seen_senders.add(e.sender_email)

            link = analytics.get_unsubscribe_link(e.unsubscribe)
            if link:
                print(f"\n{e.sender_name}:\n  {link}")
            else:
                print(f"\n{e.sender_name}: (no web unsubscribe link)")

def fetch_from_gmail(gmail, emails):
    fetched = gmail.get_emails(MAX_EMAIL)     

    database.save_emails(fetched)
    emails = database.load_emails()     

    print(f"Synced. {len(emails)} emails loaded.")
    
    return emails

gmail = GmailClient()
database.create_table()
emails = database.load_emails()

while True:
    print("\n===== Menu =====")
    print("1. Show newsletter count")
    print("2. Mark emails as read")
    print("3. Archive emails")
    print("4. Delete emails")
    print("5. Clean up by sender")
    print("6. Print unsubscribe links")
    print("7. Sync from Gmail")
    print("0. Exit")

    choice = input("\nSelect an option: ")

    if choice == "1":
        print("Showing newsletter count...")
        show_newsletter_count(emails) 

    elif choice == "2":
        print("Marking emails as read...")
        emails = read_emails(gmail, emails)

    elif choice == "3":
        print("Archiving emails...")
        emails = archive_emails(gmail, emails)

    elif choice == "4":
        print("Deleting emails...")     
        emails = trash_emails(gmail, emails)

    elif choice == "5":
        emails = clean_up_by_sender(gmail, emails)


    elif choice == "6":
        get_unsubscribe_links(emails)
    
    elif choice == "7":
        print("Fetching from Gmail...")
        emails = fetch_from_gmail(gmail, emails)

    elif choice == "0":
        print("Goodbye!")
        break

    else:
        print("Invalid option. Try again.")