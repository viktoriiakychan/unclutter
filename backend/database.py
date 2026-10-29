import sqlite3
from models import Email
import time

DB_FILE = "emails.db"
ME = "(SELECT value FROM sync_state WHERE key = 'account_email')"

def get_connection():
    conn = sqlite3.connect(DB_FILE, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email_id TEXT NOT NULL,
            filename TEXT,
            mime_type TEXT,
            size_bytes INTEGER,
            FOREIGN KEY (email_id) REFERENCES emails(id),
            UNIQUE(email_id, filename)
        )
    """)

    try:
        cursor.execute("ALTER TABLE emails ADD COLUMN one_click INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # column already exists
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

    try:
        cursor.execute("ALTER TABLE activity_log ADD COLUMN account_email TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists

    conn.commit()
    conn.close()

def create_dismissed_senders_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dismissed_senders (
            sender_email TEXT PRIMARY KEY,
            dismissed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen_email_date INTEGER
        )
    """)
    conn.commit()
    conn.close()

def create_sync_state_table():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT
        );
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
            INSERT INTO emails
            (id, thread_id, sender_name, sender_email, subject, date,
             unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe, internal_date, one_click)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                thread_id=excluded.thread_id,
                sender_name=excluded.sender_name,
                sender_email=excluded.sender_email,
                subject=excluded.subject,
                date=excluded.date,
                unread=excluded.unread,
                category=excluded.category,
                attachment_count=excluded.attachment_count,
                attachment_size=excluded.attachment_size,
                is_newsletter=excluded.is_newsletter,
                unsubscribe=excluded.unsubscribe,
                internal_date=excluded.internal_date,
                one_click=excluded.one_click
        """, (
            email.id, email.thread_id, email.sender_name, email.sender_email,
            email.subject, email.date, 1 if email.unread else 0, email.category,
            email.attachment_count, email.attachment_size,
            1 if email.is_newsletter else 0, email.unsubscribe, email.internal_date,
            1 if email.one_click else 0
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
    
    for i in range(0, len(ids), 900): # loop over chuncks = faster, 900 cos sqllite only allows 999 ? marks in one query 
        chunk = ids[i:i + 900]
        ph = ",".join("?" for _ in chunk) # placeholder 
        conn.execute(f"""
            INSERT INTO activity_log (email_id, thread_id, sender_name, sender_email, subject, date,
                unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe,
                internal_date, action_type, account_email)
            SELECT id, thread_id, sender_name, sender_email, subject, date,
                unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe,
                internal_date, 'deleted', {ME}
            FROM emails WHERE id IN ({ph})
        """, chunk)
        conn.execute(f"DELETE FROM emails WHERE id IN ({ph})", chunk)
    conn.commit()
    conn.close()


def mark_archived(ids):
    conn = get_connection()
    for i in range(0, len(ids), 900):
        chunk = ids[i:i + 900]
        ph = ",".join("?" for _ in chunk)
        conn.execute(f"""
            INSERT INTO activity_log (email_id, thread_id, sender_name, sender_email, subject, date,
                unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe,
                internal_date, action_type, account_email)
            SELECT id, thread_id, sender_name, sender_email, subject, date,
                unread, category, attachment_count, attachment_size, is_newsletter, unsubscribe,
                internal_date, 'archived', {ME}
            FROM emails WHERE id IN ({ph}) AND is_archived = 0
        """, chunk)
        conn.execute(f"UPDATE emails SET is_archived = 1 WHERE id IN ({ph})", chunk)
    conn.commit()
    conn.close()

def mark_unarchived(ids):
    conn = get_connection()
    for i in range(0, len(ids), 900):
        chunk = ids[i:i + 900]
        ph = ",".join("?" for _ in chunk)
        conn.execute(f"UPDATE emails SET is_archived = 0 WHERE id IN ({ph})", chunk)
    conn.commit()
    conn.close()  

def set_unread(ids, unread):
    conn = get_connection()
    for i in range(0, len(ids), 900):
        chunk = ids[i:i + 900]
        ph = ",".join("?" for _ in chunk)
        conn.execute(
            f"UPDATE emails SET unread = ? WHERE id IN ({ph})",
            [1 if unread else 0] + chunk,
        )
    conn.commit()
    conn.close()

def get_activity_log(limit=100):
    conn = get_connection()
    rows = conn.execute(
        f"SELECT * FROM activity_log WHERE account_email = {ME} ORDER BY timestamp DESC LIMIT ?",
        (limit,)
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

def remove_from_activity_log(ids):
    conn = get_connection()
    for i in range(0, len(ids), 900):
        chunk = ids[i:i + 900]
        ph = ",".join("?" for _ in chunk)
        conn.execute(f"DELETE FROM activity_log WHERE email_id IN ({ph}) AND account_email = {ME}", chunk)
    conn.commit()
    conn.close()

def restore_from_activity_log(ids):
    conn = get_connection()
    cursor = conn.cursor()

    for email_id in ids:
        # get the most recent log entry for this email
        row = conn.execute(
            f"SELECT * FROM activity_log WHERE email_id = ? AND account_email = {ME} ORDER BY timestamp DESC LIMIT 1",
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
            cursor.execute("DELETE FROM activity_log WHERE email_id = ?", (email_id,))

    conn.commit()
    conn.close()

def clear_all_local_data():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM emails")
    cursor.execute("DELETE FROM attachments")
    cursor.execute("DELETE FROM sync_state")

    conn.commit()
    conn.close()

def claim_account(email):
    
    conn = get_connection()
    row = conn.execute("SELECT value FROM sync_state WHERE key = 'account_email'").fetchone()

    if row and row[0] != email:
        conn.execute("DELETE FROM activity_log")
        conn.execute("DELETE FROM dismissed_senders")

    conn.execute(
        "INSERT INTO sync_state (key, value) VALUES ('account_email', ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (email,)
    )
    conn.commit()
    conn.close()

def set_account(email):
    conn = get_connection()
    old = conn.execute("SELECT value FROM sync_state WHERE key = 'account_email'").fetchone()

    if old and old[0] != email:
        conn.execute("DELETE FROM dismissed_senders")  # see note below

    conn.execute(
        "INSERT INTO sync_state (key, value) VALUES ('account_email', ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (email,)
    )
    # rows from before this column existed have no owner, give them to whoever logs in first
    conn.execute("UPDATE activity_log SET account_email = ? WHERE account_email IS NULL", (email,))
    conn.commit()
    conn.close()

def dismiss_sender_in_db(sender_email):
    conn = get_connection()
    cursor = conn.cursor()

    # find their most recent email right now
    row = cursor.execute(
        "SELECT MAX(internal_date) FROM emails WHERE sender_email = ?",
        (sender_email,)
    ).fetchone()
    latest_date = row[0]

    cursor.execute("""
        INSERT INTO dismissed_senders (sender_email, last_seen_email_date)
        VALUES (?, ?)
        ON CONFLICT(sender_email) DO UPDATE SET
            dismissed_at = CURRENT_TIMESTAMP,
            last_seen_email_date = excluded.last_seen_email_date
    """, (sender_email, latest_date))

    conn.commit()
    conn.close()

def set_last_synced():
    conn = get_connection()
    conn.execute(
        "INSERT INTO sync_state (key, value) VALUES ('last_synced', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (str(int(time.time() * 1000)),),   # milliseconds, what JavaScript's Date uses
    )
    conn.commit()
    conn.close()

def get_last_synced():
    conn = get_connection()
    row = conn.execute("SELECT value FROM sync_state WHERE key = 'last_synced'").fetchone()
    conn.close()
    return int(row[0]) if row else None