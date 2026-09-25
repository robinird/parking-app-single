interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  // Nettoyage régulier des entrées expirées pour éviter la fuite de mémoire
  if (memoryStore.size > 1000) {
    for (const [key, value] of memoryStore.entries()) {
      if (now > value.resetTime) {
        memoryStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore.set(identifier, newRecord);

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: newRecord.resetTime,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count += 1;
  memoryStore.set(identifier, record);

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}