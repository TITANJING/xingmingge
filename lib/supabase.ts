import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// anon 客户端 — 用于前端可访问的只读操作（受 RLS 限制）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// admin 客户端 — 仅用于服务端（绕过 RLS，有完整权限）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
