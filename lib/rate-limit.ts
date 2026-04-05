import { redis } from './redis'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number  // Unix timestamp (秒)
}

/**
 * 检查用户是否超出每日使用限额
 * @param userId  用户 ID
 * @param action  操作类型（如 'tarot_interpret'）
 * @param limit   免费用户每日上限（默认 3 次）
 * @param isVip   VIP 用户不限次数
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number = 3,
  isVip: boolean = false
): Promise<RateLimitResult> {
  if (isVip) {
    return { allowed: true, remaining: 999, resetAt: 0 }
  }

  // key 格式：ratelimit:{action}:{userId}:{YYYY-MM-DD}
  const today = new Date().toISOString().slice(0, 10)
  const key = `ratelimit:${action}:${userId}:${today}`

  // 计算今天剩余秒数
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(16, 0, 0, 0)  // 北京次日0点 = UTC 16:00
  if (midnight <= now) midnight.setUTCDate(midnight.getUTCDate() + 1)
  const ttl = Math.ceil((midnight.getTime() - now.getTime()) / 1000)

  // 原子递增
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, ttl)
  }

  const remaining = Math.max(0, limit - count)
  return {
    allowed: count <= limit,
    remaining,
    resetAt: Math.floor(midnight.getTime() / 1000)
  }
}
