import type { IncomingMessage } from 'http'
import { supabaseAdmin } from './supabase'

export interface AuthUser {
  id: string
  email: string
}

/**
 * 从请求头中提取并验证 JWT，返回用户信息
 * 若验证失败抛出错误
 */
export async function requireAuth(req: IncomingMessage): Promise<AuthUser> {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('未登录，请先登录')
  }

  const token = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('登录已过期，请重新登录')
  }

  return {
    id: data.user.id,
    email: data.user.email ?? ''
  }
}

/**
 * 尝试获取用户信息，不强制要求登录（可选认证）
 */
export async function optionalAuth(req: IncomingMessage): Promise<AuthUser | null> {
  try {
    return await requireAuth(req)
  } catch {
    return null
  }
}
