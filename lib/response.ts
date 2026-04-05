import type { ServerResponse } from 'http'

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

/**
 * 发送 JSON 成功响应
 */
export function sendOk<T>(res: ServerResponse, data: T, status: number = 200): void {
  const body = JSON.stringify({ ok: true, data })
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  })
  res.end(body)
}

/**
 * 发送 JSON 错误响应
 */
export function sendError(res: ServerResponse, message: string, status: number = 400): void {
  const body = JSON.stringify({ ok: false, error: message })
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  })
  res.end(body)
}

/**
 * 处理 CORS 预检请求
 * 在每个 API handler 最开始调用
 * 返回 true 表示已处理，直接 return
 */
export function handleCors(
  req: { method?: string },
  res: ServerResponse,
  allowedMethods: string = 'GET, POST, PUT, DELETE, OPTIONS'
): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', allowedMethods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return true
  }
  return false
}
