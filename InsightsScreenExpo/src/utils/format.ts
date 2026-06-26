export const formatEventSourceName = (source?: string | null) => {
  const normalized = (source ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'Community';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const toShareSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Text shown on the progress board: primary line + hashtags derived from tag slugs. */
export const buildProgressPostDisplayCaption = (autoDescription: string, autoTags: string[]): string => {
  const body = (autoDescription ?? '').trim();
  const hashtags = autoTags
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => {
      const slug = t.trim().replace(/^#+/u, '').replace(/\s+/gu, '-');
      return slug.length > 0 ? `#${slug}` : '';
    })
    .filter(Boolean);
  const tagLine = hashtags.join(' ');
  if (!body) {
    return tagLine;
  }
  if (!tagLine) {
    return body;
  }
  return `${body}\n\n${tagLine}`;
};

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
