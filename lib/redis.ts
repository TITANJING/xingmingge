import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
})

/**
 * 读取缓存，若不存在则调用 fetcher 生成并写入缓存
 * @param key    Redis key
 * @param ttl    过期时间（秒）
 * @param fetcher 生成数据的函数
 */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key)
  if (hit !== null) return hit

  const value = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(value))
  return value
}

// 常用 TTL 常量
export const TTL = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800
}
