import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../lib/supabase'
import { requireAuth } from '../../lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  // 验证 JWT
  let user: { id: string; email: string }
  try {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('未登录')
    const token = authHeader.slice(7)
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) throw new Error('登录已过期')
    user = { id: data.user.id, email: data.user.email ?? '' }
  } catch (e: any) {
    return res.status(401).json({ ok: false, error: e.message })
  }

  // GET — 获取个人资料
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      return res.status(500).json({ ok: false, error: '获取资料失败' })
    }

    return res.status(200).json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        nickname: data.nickname,
        zodiac_sign: data.zodiac_sign,
        birth_datetime: data.birth_datetime,
        is_vip: data.is_vip,
        vip_expires_at: data.vip_expires_at,
        active_skin_id: data.active_skin_id,
        created_at: data.created_at
      }
    })
  }

  // PUT — 更新个人资料
  if (req.method === 'PUT') {
    const { nickname, zodiac_sign, birth_datetime } = req.body ?? {}

    const updateData: Record<string, unknown> = {}
    if (nickname !== undefined) {
      const clean = String(nickname).trim()
      if (clean.length === 0) {
        return res.status(400).json({ ok: false, error: '昵称不能为空' })
      }
      if (clean.length > 20) {
        return res.status(400).json({ ok: false, error: '昵称不能超过20个字符' })
      }
      updateData.nickname = clean
    }
    if (zodiac_sign !== undefined) updateData.zodiac_sign = zodiac_sign
    if (birth_datetime !== undefined) updateData.birth_datetime = birth_datetime

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ ok: false, error: '没有要更新的字段' })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ ok: false, error: '更新资料失败' })
    }

    return res.status(200).json({ ok: true, data })
  }

  return res.status(405).json({ ok: false, error: '不支持的请求方法' })
}
