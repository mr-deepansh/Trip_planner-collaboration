const cache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

export const getCachedUser = (userId) => {
  const entry = cache.get(userId);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.user;
};

export const setCachedUser = (userId, user) => {
  cache.set(userId, {
    user,
    expiresAt: Date.now() + TTL_MS
  });
};

export const invalidateCachedUser = (userId) => {
  cache.delete(userId);
};
