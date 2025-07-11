import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Format a date value into a readable string.
 *
 * The string returned is relative when recent and falls back to a month/day
 * representation for older dates.
 *
 * @param {string | Date} dateString - date value parseable by `dayjs`
 * @returns {string} human friendly date string
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
