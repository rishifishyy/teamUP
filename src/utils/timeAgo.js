import { useState, useEffect } from 'react';

/**
 * Formats a timestamp / ISO date / Date object into a human-readable relative time string.
 * Examples: 'Just now', '1m ago', '5m ago', '12m ago', '1h ago', '2d ago'
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';

  const date = new Date(timestamp);
  const time = date.getTime();
  if (isNaN(time)) {
    return typeof timestamp === 'string' ? timestamp : 'Just now';
  }

  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - time) / 1000));

  if (diffInSeconds < 45) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

/**
 * Custom React Hook that returns a dynamic relative time string that automatically
 * updates live on an interval (default: 10s).
 */
export function useTimeAgo(timestamp, refreshIntervalMs = 10000) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(timestamp));

  useEffect(() => {
    setTimeAgo(formatTimeAgo(timestamp));

    if (!timestamp) return;

    const timer = setInterval(() => {
      setTimeAgo(formatTimeAgo(timestamp));
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [timestamp, refreshIntervalMs]);

  return timeAgo;
}
