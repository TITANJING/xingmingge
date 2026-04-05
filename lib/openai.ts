import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// 快速模型（日常运势、简短解读）
export const FAST_MODEL = 'gpt-4o-mini'
// 高质量模型（深度塔罗/八字解读）
export const QUALITY_MODEL = 'gpt-4o'

/**
 * 非流式调用 — 返回完整字符串
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  model: string = FAST_MODEL,
  maxTokens: number = 800
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  })
  return response.choices[0]?.message?.content ?? ''
}

/**
 * 流式调用 — 返回 AsyncIterable，适合 SSE 场景
 */
export async function chatStream(
  systemPrompt: string,
  userMessage: string,
  model: string = QUALITY_MODEL,
  maxTokens: number = 1500
) {
  return openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  })
}
