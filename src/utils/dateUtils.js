import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Formats a date string as:
 * - "Today at 3:45 PM"
 * - "Yesterday at 9:20 AM"
 * - "3 days ago" (for recent but older events)
 * - "May 28 at 4:20 PM" or "Oct 10, 2023 at 1:22 PM"
 */
export function formatDate(dateString) {
  const date = dayjs(dateString);
  const now = dayjs();

  if (date.isSame(now, 'day')) {
    return `Today at ${date.format('h:mm A')}`;
  }

  if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return `Yesterday at ${date.format('h:mm A')}`;
  }

  const diffInMinutes = now.diff(date, 'minute');
  if (diffInMinutes < 48 * 60) {
    return date.fromNow(); // "3 days ago", etc.
  }

  const showYear = date.year() !== now.year();
  return date.format(showYear ? 'MMM D, YYYY [at] h:mm A' : 'MMM D [at] h:mm A');
}
