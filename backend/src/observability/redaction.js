const SENSITIVE_PATTERNS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'auth',
  'authorization',
  'cookie',
  'session',
  'csrf',
  'xsrf',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin'
];

const REDACTED = '***REDACTED***';

function isSensitiveKey(key) {
  const lowerKey = String(key).toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lowerKey.includes(pattern));
}

export function redact(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...(obj.code && { code: obj.code })
    };
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, seen));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      redacted[key] = REDACTED;
    } else if (value && typeof value === 'object') {
      redacted[key] = redact(value, seen);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export function redactAuthHeader(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return authHeader;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return `${parts[0]} ${REDACTED}`;
  }

  return REDACTED;
}

export function redactCookies(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return cookieHeader;
  }

  return cookieHeader
    .split(';')
    .map((cookie) => {
      const [key] = cookie.trim().split('=');
      return `${key}=${REDACTED}`;
    })
    .join('; ');
}

export function redactSQL(sql) {
  if (!sql || typeof sql !== 'string') {
    return sql;
  }

  return sql.replace(/'[^']*'/g, "'***'").replace(/"[^"]*"/g, '"***"');
}

export function redactEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email;
  }

  const [local, domain] = email.split('@');
  const redactedLocal = local.length > 2 ? `${local[0]}***` : '***';
  return `${redactedLocal}@${domain}`;
}

export function redactIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return ip;
  }

  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':');
    parts[parts.length - 1] = '***';
    return parts.join(':');
  }

  return ip;
}

export function createRedactor(additionalPatterns = []) {
  const patterns = [...SENSITIVE_PATTERNS, ...additionalPatterns];

  return function customRedact(obj, seen = new WeakSet()) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj)) {
      return '[Circular]';
    }

    seen.add(obj);

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack
      };
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => customRedact(item, seen));
    }

    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = String(key).toLowerCase();
      const shouldRedact = patterns.some((pattern) =>
        lowerKey.includes(pattern)
      );

      if (shouldRedact) {
        redacted[key] = REDACTED;
      } else if (value && typeof value === 'object') {
        redacted[key] = customRedact(value, seen);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  };
}

export default {
  redact,
  redactAuthHeader,
  redactCookies,
  redactSQL,
  redactEmail,
  redactIP,
  createRedactor
};
