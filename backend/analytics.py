from collections import Counter
import math
import time

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from collections import Counter

LOCAL_TZ = ZoneInfo("Europe/Dublin")

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
        """
        SELECT
            CASE WHEN is_newsletter = 1 THEN 'newsletter' ELSE category END as effective_category,
            COUNT(*)
        FROM emails
        WHERE internal_date >= ?
        GROUP BY effective_category
        """,
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


def get_email_heatmap(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    rows = conn.execute(
        "SELECT internal_date FROM emails WHERE internal_date >= ?",
        (cutoff_ms,)
    ).fetchall()

    counts = {}

    for day in range(7):
        for hour in range(24):
            counts[(day, hour)] = 0
    
    for row in rows:
        dt_utc = datetime.fromtimestamp(int(row[0]) / 1000, tz=timezone.utc)
        dt_local = dt_utc.astimezone(LOCAL_TZ)

        key = (dt_local.weekday(), dt_local.hour)
        counts[key] = counts.get(key, 0) + 1

    result = []
    for day in range(7):
        for hour in range(24):
            result.append({"day": day, "hour": hour, "count": counts[(day, hour)]})

    return result

def email_volume_stats(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    rows = conn.execute(
        "SELECT internal_date FROM emails WHERE internal_date >= ?",
        (cutoff_ms,)
    ).fetchall()

    today = datetime.now(LOCAL_TZ).date()
    daily_counts = {}

    for i in range(days - 1, -1, -1): # start stop step 
        d = (today - timedelta(days=i)).isoformat() 
        daily_counts[d] = 0

    for row in rows:
        dt_utc = datetime.fromtimestamp(int(row[0]) / 1000, tz=timezone.utc)
        dt_local = dt_utc.astimezone(LOCAL_TZ)
        day_key = dt_local.date().isoformat()
        if day_key in daily_counts:
            daily_counts[day_key] += 1

    result = [{"date": d, "count": c} for d, c in sorted(daily_counts.items())]
    return result


def get_num_emails_with_attachment(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    return conn.execute(
        "SELECT COUNT(*) FROM emails WHERE internal_date >= ? AND attachment_count >= 1", (cutoff_ms,)
    ).fetchone()[0]

def get_total_attachment_size(conn, days=30):
    cutoff_ms = _cutoff_ms(days)

    return conn.execute("SELECT SUM(attachment_size) FROM emails WHERE internal_date >= ?", (cutoff_ms,)).fetchone()[0] or 0    

def get_largest_attachment_list(conn, days=30):
    cutoff_ms = _cutoff_ms(days)

    rows = conn.execute("""
        SELECT a.filename, a.size_bytes, a.mime_type, e.sender_name, e.subject
        FROM attachments a
        JOIN emails e ON a.email_id = e.id
        WHERE e.internal_date >= ?
        ORDER BY a.size_bytes DESC
        LIMIT 10
    """, (cutoff_ms,)).fetchall()

    return [
        {
            "filename": row[0],
            "size_bytes": row[1],
            "mime_type": row[2],
            "sender_name": row[3],
            "subject": row[4],
        }
        for row in rows
    ]

def _categorize_mime(mime_type):
    if "pdf" in mime_type:
        return "PDF"
    elif "image" in mime_type:
        return "Image"
    elif "word" in mime_type or "document" in mime_type:
        return "Doc"
    elif "sheet" in mime_type or "excel" in mime_type:
        return "Spreadsheet"
    elif "zip" in mime_type or "compressed" in mime_type:
        return "Archive"
    else:
        return "Other"

def get_attachment_type_breakdown(conn, days=30):
    cutoff_ms = _cutoff_ms(days)
    rows = conn.execute("""
        SELECT a.mime_type 
        FROM attachments a
        JOIN emails e ON a.email_id = e.id
        WHERE e.internal_date >= ?
    """, (cutoff_ms,)).fetchall()
    
    counts = {}
    for row in rows:
        category = _categorize_mime(row[0] or "")
        counts[category] = counts.get(category, 0) + 1
    
    return counts

def noise_color(score):
    if score >= 65:
        return "red"
    elif score >= 50:
        return "orange"
    elif score >= 30:
        return "yellow"
    else:
        return "green"

def get_sender_noise_scores(conn, min_emails=2):
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sender_email,
               MAX(sender_name) as sender_name,
               COUNT(*) as total,
               SUM(CASE WHEN unread = 1 THEN 1 ELSE 0 END) as unread_count
        FROM emails
        GROUP BY sender_email
        HAVING COUNT(*) >= ?
    """, (min_emails,))
    base_rows = cursor.fetchall()

    cursor.execute("""
        SELECT sender_email, COUNT(*) as deleted_count
        FROM activity_log
        WHERE action_type = 'deleted'
        GROUP BY sender_email
    """)
    deleted_map = {row[0]: row[1] for row in cursor.fetchall()}

    conn.close()

    scored = []
    for sender_email, sender_name, total, unread_count in base_rows:
        deleted_count = deleted_map.get(sender_email, 0)
        unread_rate = unread_count / total
        deleted_rate = deleted_count / total

        noise_score = round((unread_rate * 80 + deleted_rate * 40), 1)
        is_flagged = True if noise_score > 70 else False 

        scored.append({
            "sender_email": sender_email,
            "sender_name": sender_name,
            "unread_rate": round(unread_rate * 100, 1),
            "unread_count": unread_count,
            "total_emails": total,
            "noise_score": noise_score,
            "is_flagged": is_flagged,
            "color": noise_color(noise_score),
        })

    scored.sort(key=lambda x: x["noise_score"], reverse=True)
    return scored

def get_inbox_health_score(conn):
    # unread 
    unread_stats = get_unread_stats(conn, days=30) 
    unread_pct = unread_stats["percentageUnread"]  # already 0-100
    
    # noise
    senders = get_sender_noise_scores(conn)
    avg_noise = sum(s["noise_score"] for s in senders) / len(senders) if senders else 0
    
    conn.close()
    
    health_score = round(100 - (unread_pct * 0.5 + avg_noise * 0.5), 1)
    return {
        "health_score": health_score,
        "backlog_pct": round(unread_pct, 1),
        "avg_noise": round(avg_noise, 1),
    }