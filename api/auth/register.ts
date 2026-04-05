import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: '不支持的请求方法' })
  }

  const { email, password, nickname } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: '邮箱和密码不能为空' })
  }
  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: '密码至少需要6位' })
  }

  const cleanNickname = (nickname ?? '').trim() || '神秘访客'

  // 调用 Supabase Auth 注册
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // 跳过邮件验证，直接激活（内测阶段）
    user_metadata: { nickname: cleanNickname }
  })

  if (error) {
    // 常见错误翻译
    let message = error.message
    if (message.includes('already registered')) message = '该邮箱已注册'
    if (message.includes('invalid email')) message = '邮箱格式不正确'
    return res.status(400).json({ ok: false, error: message })
  }

  // 用注册的账号获取 session token（供前端直接使用）
  const { data: sessionData, error: sessionError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password })

  if (sessionError || !sessionData.session) {
    // 注册成功但获取 token 失败（少见），让用户手动登录
    return res.status(201).json({
      ok: true,
      data: {
        user: { id: data.user.id, email: data.user.email, nickname: cleanNickname },
        access_token: null,
        message: '注册成功，请登录'
      }
    })
  }

  return res.status(201).json({
    ok: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        nickname: cleanNickname
      },
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at
    }
  })
}
