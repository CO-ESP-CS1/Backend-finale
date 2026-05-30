const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function normalizeMediaUrl(
  url: string | null | undefined,
  requestHost?: string,
  protocol = 'http',
): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }

  if (!requestHost) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${protocol}://${requestHost}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (LOCAL_HOSTS.has(parsed.hostname)) {
      const [hostname, port] = requestHost.split(':');
      parsed.hostname = hostname;
      parsed.port = port ?? '';
      parsed.protocol = `${protocol}:`;
      return parsed.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function rewriteMediaUrlsInPayload<T>(
  data: T,
  requestHost?: string,
  protocol = 'http',
): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      rewriteMediaUrlsInPayload(item, requestHost, protocol),
    ) as T;
  }

  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }

    const record = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key === 'couvertureUrl' && typeof value === 'string') {
        out[key] =
          normalizeMediaUrl(value, requestHost, protocol) ?? value;
      } else {
        out[key] = rewriteMediaUrlsInPayload(value, requestHost, protocol);
      }
    }

    return out as T;
  }

  return data;
}
