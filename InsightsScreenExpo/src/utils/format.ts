export const formatEventSourceName = (source?: string | null) => {
  const normalized = (source ?? '').trim().toLowerCase();
  if (normalized === 'ticketmaster') {
    return 'Ticketmaster';
  }
  if (normalized === 'eventbrite') {
    return 'Eventbrite';
  }
  if (!normalized) {
    return 'Ticketmaster';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const toShareSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const toErrorText = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
