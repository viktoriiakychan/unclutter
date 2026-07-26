from collections import Counter
import math
import time

from datetime import datetime, timezone, timedelta

def get_unread_emails(emails):
    count = 0

    for email in emails:
        if email.unread:
            count += 1

    return count

def get_sender_counts(emails):
    counter = Counter()

    for email in emails:
        counter[email.sender_email] += 1
    
    return counter


def get_newsletter_counts(emails):
    counter = Counter()

    for email in emails:
        if email.is_newsletter:
            counter[email.sender_email] += 1
    
    return counter

def get_newsletter_count(emails):

    count = 0

    for email in emails:
        if email.is_newsletter:
            count += 1

    return count

def get_unsubscribe_link(unsubscribe_header):
    if not unsubscribe_header:
        return None

    parts = unsubscribe_header.split(",")

    for part in parts:
        # remove whitespace and < >
        cleaned = part.strip().strip("<>").strip()

        if cleaned.startswith("http"):
            return cleaned

    return None

def get_top_offender(emails):
    # group senders & their emails
    by_sender = {}
    for e in emails:
        by_sender.setdefault(e.sender_email, []).append(e)

    min_count = max(3, int(len(emails) * 0.15)) # if the inbox is very small 3 is safety feature
    candidates = {}
    for sens, ems in by_sender.items():
        if len(ems) >= min_count:
            candidates[sens] = ems

    if not candidates:
        return None

    def badness(group):
        unread_ratio = sum(1 for e in group if e.unread) / len(group)
        return unread_ratio * math.sqrt(len(group))   

    worst_sender = max(candidates, key=lambda s: badness(candidates[s]))
    group = candidates[worst_sender]

    unread_ratio = sum(1 for e in group if e.unread) / len(group)

    return {
        "title": f"Everything from {group[0].sender_name}",
        "subtitle": f"{int(unread_ratio*100)}% of these went unread",
        "count": len(group),
        "ids": [e.id for e in group],
        "badge": "top offender",
        "sender": group[0].sender_name
    }   

def get_stale_promotions(emails, days=30):

    cutoff = time.time() * 1000 - (days * 24 * 60 * 60 * 1000) # x days ago     
    matches = [e for e in emails if e.category == "promotions" and e.internal_date < cutoff]

    if not matches:
        return None
    
    return {
        "title": f"Promotions older than {days} days",
        "subtitle": f"Deals that have likely expire",
        "count": len(matches),
        "ids": [e.id for e in matches],
        "badge": "promotion",
        "sender": "%"

    }   

def get_old_unread(emails, days=60):
    cutoff = time.time() * 1000 - (days * 24 * 60 * 60 * 1000) # x days ago     
    matches = [e for e in emails if e.unread and e.internal_date < cutoff]

    if not matches:
        return None

    return {
        "title": f"Unread emails older than {days} days",
        "subtitle": "These have been forgotten for months",
        "count": len(matches),
        "ids": [e.id for e in matches],
        "badge": "unread",
        "sender": "Unread"

    }

def get_suggestions(emails):
    results = [
        get_top_offender(emails),
        get_stale_promotions(emails),
        get_old_unread(emails),
    ]
    return [r for r in results if r is not None]

def _cutoff_ms(days):
    return int((datetime.now(timezone.utc).timestamp() - days * 86400) * 1000)

def get_total_email_count(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    return conn.execute(
        "SELECT COUNT(*) FROM emails WHERE internal_date >= ?", (cutoff_ms,)
    ).fetchone()[0]

def get_unread_stats(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    total = get_total_email_count(conn, days)
    unread = conn.execute(
        "SELECT COUNT(*) FROM emails WHERE unread = 1 AND internal_date >= ?", (cutoff_ms,)
    ).fetchone()[0]
    read = total - unread

    if total == 0:
        return {"unread": 0, "read": 0, "percentageUnread": 0, "percentageRead": 0}

    return {
        "unread": unread,
        "read": read,
        "percentageUnread": round(unread / total * 100),
        "percentageRead": round(read / total * 100),
    }

def get_category_breakdown(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    rows = conn.execute(
        "SELECT category, COUNT(*) FROM emails WHERE internal_date >= ? GROUP BY category",
        (cutoff_ms,)
    ).fetchall()
    return [{"name": r[0], "count": r[1]} for r in rows]

def get_oldest_unread_days(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    row = conn.execute(
        "SELECT MIN(internal_date) FROM emails WHERE unread = 1 AND internal_date >= ?",
        (cutoff_ms,)
    ).fetchone()
    oldest_date = row[0]

    if oldest_date is None:
        return None

    oldest_dt = datetime.fromtimestamp(int(oldest_date) / 1000, tz=timezone.utc)
    return (datetime.now(timezone.utc) - oldest_dt).days

def get_cleaned_up_count(conn, days=30):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    return conn.execute(
        "SELECT COUNT(*) FROM activity_log WHERE timestamp >= ?", (cutoff,)
    ).fetchone()[0]

def get_avg_emails_per_day(conn, days=30):
    cutoff_ms = int((datetime.now(timezone.utc).timestamp() - days * 86400) * 1000)
    rows = conn.execute(
        "SELECT date(internal_date/1000, 'unixepoch') as day, COUNT(*) "
        "FROM emails WHERE internal_date >= ? GROUP BY day",
        (cutoff_ms,)
    ).fetchall()

    counts = {row[0]: row[1] for row in rows}
    if not counts:
        return 0
    return round(sum(counts.values()) / len(counts))


