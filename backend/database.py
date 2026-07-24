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

def create_activity_table():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id TEXT NOT NULL,
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
            action_type TEXT NOT NULL, -- 'deleted' or 'archived'
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    create_table()
    create_activity_table()
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
    conn = get_connection()
    cursor = conn.cursor()

    for email_id in ids:
        row = conn.execute("SELECT * FROM emails WHERE id = ?", (email_id,)).fetchone()

        if row:
            cursor.execute("""
                INSERT INTO activity_log
                (email_id, thread_id, sender_name, sender_email, subject, date,
                 unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date, action_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row[0], row[1], row[2], row[3], row[4], row[5],
                row[6], row[7], row[8], row[9], row[10], row[11], row[12],
                "deleted"
            ))

    placeholders = ",".join("?" for _ in ids)
    cursor.execute(f"DELETE FROM emails WHERE id IN ({placeholders})", ids)

    conn.commit()
    conn.close()

def mark_archived(ids):
    conn = get_connection()
    cursor = conn.cursor()

    for email_id in ids:
        row = conn.execute("SELECT * FROM emails WHERE id = ?", (email_id,)).fetchone()

        if row:
            cursor.execute("""
                INSERT INTO activity_log
                (email_id, thread_id, sender_name, sender_email, subject, date,
                 unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date, action_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row[0], row[1], row[2], row[3], row[4], row[5],
                row[6], row[7], row[8], row[9], row[10], row[11], row[12],
                "archived"
            ))

    placeholders = ",".join("?" for _ in ids)
    cursor.execute(f"UPDATE emails SET is_archived = 1 WHERE id IN ({placeholders})", ids)

    conn.commit()
    conn.close()

def mark_unarchived(ids):
    conn = get_connection()
    cursor = conn.cursor()

    placeholders = ",".join("?" for _ in ids)
    cursor.execute(
        f"UPDATE emails SET is_archived = 0 WHERE id IN ({placeholders})",
        ids
    )

    conn.commit()
    conn.close()    

def get_activity_log(limit=100):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    return [
        {
            "id": row[0],
            "email_id": row[1],
            "thread_id": row[2],
            "sender_name": row[3],
            "sender_email": row[4],
            "subject": row[5],
            "date": row[6],
            "unread": row[7],
            "category": row[8],
            "attachment_count": row[9],
            "attachment_size": row[10],
            "is_newsletter": row[11],
            "unsubscribe": row[12],
            "internal_date": row[13],
            "action_type": row[14],
            "timestamp": row[15],
        }
        for row in rows
    ]

def restore_from_activity_log(ids):
    conn = get_connection()
    cursor = conn.cursor()

    for email_id in ids:
        # get the most recent log entry for this email
        row = conn.execute(
            "SELECT * FROM activity_log WHERE email_id = ? ORDER BY timestamp DESC LIMIT 1",
            (email_id,)
        ).fetchone()

        if row:
            cursor.execute("""
                INSERT OR REPLACE INTO emails
                (id, thread_id, sender_name, sender_email, subject, date,
                 unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                row[1], row[2], row[3], row[4], row[5], row[6],
                row[7], row[8], row[9], row[10], row[11], row[12], row[13]
            ))
            # remove the log entry now that it's been restored
            cursor.execute("DELETE FROM activity_log WHERE id = ?", (row[0],))

    conn.commit()
    conn.close()