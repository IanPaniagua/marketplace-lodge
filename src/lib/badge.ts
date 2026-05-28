/** Sync the OS app icon badge to the given unread count. No-op when the API is unavailable (e.g. iOS non-installed, Firefox). */
export async function syncAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  if (count > 0) {
    await navigator.setAppBadge?.(count);
  } else {
    await navigator.clearAppBadge?.();
  }
}
