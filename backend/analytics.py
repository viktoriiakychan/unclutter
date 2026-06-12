from collections import Counter

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