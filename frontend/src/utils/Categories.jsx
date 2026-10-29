// one look per category, used everywhere (pills, avatars, filter chips, stat dots)
export const CATEGORY_STYLES = {
  newsletter: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700", avatar: "bg-amber-100 text-amber-700" },
  promotions: { dot: "bg-pink-500", pill: "bg-pink-50 text-pink-700", avatar: "bg-pink-100 text-pink-700" },
  updates: { dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700", avatar: "bg-sky-100 text-sky-700" },
  social: { dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700", avatar: "bg-violet-100 text-violet-700" },
  forums: { dot: "bg-teal-500", pill: "bg-teal-50 text-teal-700", avatar: "bg-teal-100 text-teal-700" },
  other: { dot: "bg-gray-400", pill: "bg-gray-100 text-gray-600", avatar: "bg-gray-100 text-gray-600" },
};

// newsletters are their own category in the UI, whatever Gmail says
export function getCategory(email) {
  if (email.is_newsletter) return "newsletter";
  return CATEGORY_STYLES[email.category] ? email.category : "other";
}

export function getCategoryStyle(email) {
  return CATEGORY_STYLES[getCategory(email)];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// the filter chips above the email list. `test` decides if an email matches
export const EMAIL_FILTERS = [
  { name: "All", dot: null, test: () => true },
  { name: "Unread", dot: "bg-blue-600", test: (e) => e.unread },
  { name: "Newsletter", dot: CATEGORY_STYLES.newsletter.dot, test: (e) => e.is_newsletter },
  { name: "Promotions", dot: CATEGORY_STYLES.promotions.dot, test: (e) => getCategory(e) === "promotions" },
  { name: "Updates", dot: CATEGORY_STYLES.updates.dot, test: (e) => getCategory(e) === "updates" },
  { name: "Older than 30 days", dot: null, test: (e) => Number(e.internal_date) < Date.now() - THIRTY_DAYS_MS },
];