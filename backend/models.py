from dataclasses import dataclass

@dataclass
class Email:
    id: str
    thread_id: str
    sender_name: str
    sender_email: str
    subject: str
    date: str
    unread: bool
    category: str
    attachment_count: int
    attachment_size: int
    is_newsletter: bool    
    category: str
    unsubscribe: str = ""
    internal_date: int = 0