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
            category TEXT,
            attachment_count INTEGER,
            attachment_size INTEGER,
            is_newsletter INTEGER,
            unsubscribe TEXT,
            internal_date INTEGER,
            is_archived INTEGER DEFAULT 0
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
             unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            email.id,
            email.thread_id,
            email.sender_name,
            email.sender_email,
            email.subject,
            email.date,
            1 if email.unread else 0,
            email.category,
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

    cursor.execute("SELECT * FROM emails WHERE is_archived = 0 ORDER BY internal_date DESC")
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
            category=row[7],            # 1/0 back to True/False
            attachment_count=row[8],
            attachment_size=row[9],
            is_newsletter=bool(row[10]),     # 1/0 back to True/False
            unsubscribe=row[11],
            internal_date=row[12],
            is_archived=bool(row[13]),
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

def get_existing_ids():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id from emails")
    rows = cursor.fetchall()
    conn.close()

    return {row[0] for row in rows} # a set of ids 

def delete_emails(ids):
    conn = get_connection() # open connection to emails.db
    cursor = conn.cursor() # object used to run SQL commnds 

    placeholders = ",".join("?" for _ in ids) # builds a string with one ? per item in ids, separated by commas
    cursor.execute(f"DELETE FROM emails WHERE id IN ({placeholders})", ids)

    conn.commit()
    conn.close()

def mark_archived(ids):
    conn = get_connection()
    cursor = conn.cursor()

    placeholders = ",".join("?" for _ in ids)
    cursor.execute(
        f"UPDATE emails SET is_archived = 1 WHERE id IN ({placeholders})",
        ids
    )

    conn.commit()
    conn.close()