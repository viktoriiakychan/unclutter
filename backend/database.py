import sqlite3
from models import Email

DB_FILE = "emails.db"

def get_connection():
    return sqlite3.connect(DB_FILE)

def create_table():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id TEXT PRIMARY KEY,
            thread_id TEXT,
            sender_name TEXT,
            sender_email TEXT,
            subject TEXT,
            date TEXT,
            unread INTEGER,
            attachment_count INTEGER,
            attachment_size INTEGER,
            is_newsletter INTEGER,
            unsubscribe TEXT,
            internal_date INTEGER
        )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_table()
    print("Database and table created.")


def save_emails(emails):
    conn = get_connection()
    cursor = conn.cursor()

    for email in emails:
        cursor.execute("""
           INSERT OR REPLACE INTO emails
            (id, thread_id, sender_name, sender_email, subject, date,
             unread, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            email.id,
            email.thread_id,
            email.sender_name,
            email.sender_email,
            email.subject,
            email.date,
            1 if email.unread else 0,
            email.attachment_count,
            email.attachment_size,
            1 if email.is_newsletter else 0,
            email.unsubscribe,
            email.internal_date
        ))

    conn.commit()
    conn.close()
    print(f"Saved {len(emails)} emails to the database.")

def load_emails():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM emails")
    rows = cursor.fetchall()

    conn.close()

    emails = []
    for row in rows:
        email = Email(
            id=row[0],
            thread_id=row[1],
            sender_name=row[2],
            sender_email=row[3],
            subject=row[4],
            date=row[5],
            unread=bool(row[6]),            # 1/0 back to True/False
            attachment_count=row[7],
            attachment_size=row[8],
            is_newsletter=bool(row[9]),     # 1/0 back to True/False
            unsubscribe=row[10],
            internal_date=row[11]
        )
        emails.append(email)

    return emails


def clear_emails():
    create_table()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM emails")
    conn.commit()
    conn.close()