from collections import Counter
import math

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


