import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '不支持的请求方法' })
  }

  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: '邮箱和密码不能为空' })
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data.session) {
    let message = '邮箱或密码错误'
    if (error?.message.includes('Email not confirmed')) message = '邮箱尚未验证'
    if (error?.message.includes('Invalid login credentials')) message = '邮箱或密码错误'
    return res.status(401).json({ ok: false, error: message })
  }

  // 查询 profile 获取昵称等信息
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('nickname, zodiac_sign, is_vip, active_skin_id')
    .eq('id', data.user.id)
    .single()

  return res.status(200).json({
    ok: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        nickname: profile?.nickname ?? '神秘访客',
        zodiac_sign: profile?.zodiac_sign ?? null,
        is_vip: profile?.is_vip ?? false,
        active_skin_id: profile?.active_skin_id ?? 'default'
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  })
}
