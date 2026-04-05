# 星命阁 · 后端架构方案（多方案对比版）

---

## 一、行业成功案例参考

### Co-Star（估值 $100M+，用户 2000 万+）
- **定位：** AI 驱动的个性化占星，社交属性强
- **技术栈：** Kotlin + Google BigQuery + spaCy/BERT (NLP) + Hadoop
- **AI 策略：** 用 NLP 模型生成个性化文案，非模板填空；每日推送独特于每个用户
- **数据源：** Swiss Ephemeris（行星星历表）+ NASA API
- **可借鉴：** AI 个性化生成 + 社交分享 + 推送通知是增长飞轮

### The Pattern（被 Tinder 母公司收购）
- **定位：** 心理学 + 占星融合，深度人格分析
- **技术栈：** 私有算法引擎 + ML 模型 + 实时天体数据
- **AI 策略：** 不是简单运势，而是基于出生盘做"人生阶段"分析；Bonds 功能做双人兼容性
- **可借鉴：** 深度内容 > 浅运势；"关系匹配"功能极具粘性

### AstroTalk（印度，年收入 $30M+）
- **定位：** 在线占星师咨询平台（类似占卜版"微医"）
- **技术栈：** Node.js + MongoDB + Firebase + Razorpay 支付
- **模式：** 真人占星师 + AI 辅助，按分钟收费
- **可借鉴：** 免费运势引流 → 付费深度解读的漏斗模式

### 卜易居 / 星座屋（中国）
- **定位：** 传统算命门户，SEO 流量为主
- **技术栈：** PHP (Laravel) + MySQL，传统 CMS 模式
- **模式：** 广告收入 + 付费详批
- **可借鉴：** 八字/姓名测试等中式算命的产品形态；SEO 策略

### 共同启示
> **免费基础功能（每日运势/单次占卜）→ 注册解锁历史记录 → AI深度解读付费**
> 这是行业验证过的变现漏斗。

---

## 二、四套后端方案

---

### 方案 A：Vercel Serverless + Supabase（⭐ 推荐·快速起步）

```
┌─────────────────────────┐
│  静态前端 (HTML/JS)       │ ← Vercel 托管静态文件
└──────────┬──────────────┘
           │ fetch
┌──────────▼──────────────┐
│  Vercel Serverless Fn    │ ← TypeScript, /api/* 路由
│  (Edge/Node Runtime)     │
└──┬───────┬──────────┬───┘
   │       │          │
   ▼       ▼          ▼
Supabase  Upstash    Claude API
(PG+Auth) (Redis)    (Anthropic)
```

| 维度 | 说明 |
|------|------|
| **框架** | Vercel Serverless Functions (TypeScript) |
| **数据库** | Supabase (PostgreSQL) — 免费 1GB + 内置 Auth |
| **认证** | Supabase Auth (JWT, Email/Password, OAuth) |
| **缓存** | Upstash Redis (免费 10K 请求/天) |
| **AI** | Claude API (Anthropic) |
| **定时任务** | Vercel Cron Jobs |
| **部署** | git push 自动部署，自动 HTTPS + CDN |

**优势：**
- 开发期几乎零成本（免费额度覆盖 MVP）
- 最快上线路径：git push 即部署
- Supabase Auth 省去自建认证系统的工作量
- TypeScript 全栈统一，与现有 JS 前端无缝衔接

**劣势：**
- Serverless 冷启动 100-200ms（首次请求略慢）
- 函数执行时限 10 秒（Hobby）/ 60 秒（Pro），AI 长对话可能受限
- 强依赖 Vercel + Supabase 两个平台

**月成本：**
- 开发期：~$5（仅 AI 调用费）
- 增长期（500 日活）：~$50-80

**适合场景：** MVP 快速验证、个人项目、想最快看到效果

---

### 方案 B：Next.js 全栈 + Supabase（现代全栈框架）

```
┌──────────────────────────────┐
│  Next.js 15 App               │
│  ┌────────────┬─────────────┐│
│  │ 前端 (React)│ API Routes  ││ ← 前后端一体
│  │ SSR/SSG    │ Server Act. ││
│  └────────────┴─────────────┘│
└──────┬───────┬───────┬───────┘
       │       │       │
       ▼       ▼       ▼
   Supabase  Upstash  Claude API
```

| 维度 | 说明 |
|------|------|
| **框架** | Next.js 15 (App Router, Server Components, Server Actions) |
| **数据库** | Supabase (PostgreSQL) |
| **认证** | Supabase Auth + Next.js Middleware |
| **缓存** | Upstash Redis + Next.js 内置 ISR 缓存 |
| **AI** | Claude API + Vercel AI SDK（内置流式支持） |
| **定时任务** | Vercel Cron |
| **部署** | Vercel（Next.js 原生支持） |

**优势：**
- 前后端一体化，代码组织最整洁
- Vercel AI SDK 内置 `useChat` 等流式 UI 组件，AI 集成体验最好
- Server Components 可直接查数据库，减少 API 层代码
- ISR (Incremental Static Regeneration) 可把每日运势页面静态化，性能极好
- 未来扩展到完整 Web App 最顺滑（路由/布局/SEO 全内置）

**劣势：**
- 需要把现有 HTML 页面迁移到 React/Next.js 组件（工作量最大）
- 学习曲线：React + Next.js App Router 有一定复杂度
- 构建产物较大，冷启动比纯 Serverless 函数稍慢

**月成本：**
- 开发期：~$5
- 增长期：~$50-80（与方案 A 类似）

**适合场景：** 想长期迭代成完整产品、愿意投入学习 React/Next.js

---

### 方案 C：Python FastAPI + 云数据库（AI 优先）

```
┌─────────────────────────┐
│  静态前端 (HTML/JS)       │ ← Netlify/Vercel 托管
└──────────┬──────────────┘
           │ fetch
┌──────────▼──────────────┐
│  FastAPI (Python 3.12)   │ ← Railway/Render 部署
│  uvicorn + gunicorn      │
└──┬───────┬──────────┬───┘
   │       │          │
   ▼       ▼          ▼
Supabase  Redis      Claude API
(PG)     (Upstash)   + LangChain
```

| 维度 | 说明 |
|------|------|
| **框架** | FastAPI (Python) — 异步、自动 OpenAPI 文档 |
| **数据库** | Supabase PostgreSQL（通过 SQLAlchemy/asyncpg 连接） |
| **认证** | 自建 JWT (PyJWT + bcrypt) 或 Supabase Auth REST API |
| **缓存** | Upstash Redis |
| **AI** | Claude API + LangChain（Python 版最完整） |
| **定时任务** | APScheduler（内置）或 Upstash QStash |
| **部署** | Railway / Render / Fly.io（$5-7/月起） |

**优势：**
- Python AI 生态最强：LangChain、LlamaIndex、spaCy 等直接可用
- FastAPI 自动生成 Swagger 文档，API 调试极方便
- 适合未来扩展复杂算法（八字排盘算法、星盘计算用 Python 天文库）
- 计算密集任务（如批量生成运势）比 Node.js 灵活

**劣势：**
- 前后端分离，两套语言/工具链
- Python Serverless 冷启动慢（1-3 秒），需要常驻进程部署
- Railway/Render 免费额度有限（约 500 小时/月），需要付费保持在线
- 认证需要自建或额外集成

**月成本：**
- 开发期：$5-12（Railway $5 + AI 调用）
- 增长期：$30-60

**适合场景：** 想深度定制 AI 算法、计划加入复杂命理计算、有 Python 经验

---

### 方案 D：Firebase 全家桶（谷歌生态·最省事）

```
┌─────────────────────────┐
│  静态前端 (HTML/JS)       │ ← Firebase Hosting (CDN)
└──────────┬──────────────┘
           │ Firebase SDK
┌──────────▼──────────────┐
│  Cloud Functions         │ ← Node.js/TypeScript
│  (Firebase v2)           │
└──┬───────┬──────────┬───┘
   │       │          │
   ▼       ▼          ▼
Firestore  Firebase   Claude API
(NoSQL)    Auth
```

| 维度 | 说明 |
|------|------|
| **框架** | Firebase Cloud Functions v2 (TypeScript) |
| **数据库** | Firestore (NoSQL 文档数据库) |
| **认证** | Firebase Auth（Google/Email/匿名登录，最成熟） |
| **缓存** | Firestore 自带缓存 + 可选 Memorystore |
| **AI** | Claude API 或 Vertex AI (Google) |
| **定时任务** | Cloud Scheduler (Firebase 集成) |
| **部署** | `firebase deploy` 一键部署全部 |

**优势：**
- 一个平台搞定一切：Hosting + Auth + Database + Functions + 定时任务
- Firebase Auth 是行业最成熟的认证方案，支持 20+ OAuth 提供商
- 前端直连 Firestore，简单查询不需要后端 API
- 离线支持：Firestore 客户端 SDK 自带离线缓存
- 免费额度慷慨（Spark 计划：50K 读/天, 20K 写/天）

**劣势：**
- Firestore 是 NoSQL，复杂查询不如 PostgreSQL 灵活
- 完全绑定 Google Cloud，迁移成本高
- 闭源，无法自托管
- Cloud Functions 冷启动可能更慢（尤其 v2）
- 成本不透明，流量大时可能意外高额账单

**月成本：**
- 开发期：$0-5（Spark 免费计划）
- 增长期：$25-100（Blaze 按量计费，不可预测）

**适合场景：** 想要最少的服务拼装、熟悉 Google 生态、对 NoSQL 没有排斥

---

## 三、方案横向对比

| 维度 | A: Vercel+Supabase | B: Next.js全栈 | C: Python FastAPI | D: Firebase |
|------|:------------------:|:--------------:|:-----------------:|:-----------:|
| **上手速度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **前端改动量** | 无需改 | 全部重写为React | 无需改 | 无需改 |
| **AI 集成** | 好 | 最好(AI SDK) | 最强(LangChain) | 好 |
| **数据库灵活性** | PostgreSQL ✓ | PostgreSQL ✓ | PostgreSQL ✓ | NoSQL △ |
| **认证难度** | 零代码 | 低 | 中等(需自建) | 零代码 |
| **开发期成本** | ~$5/月 | ~$5/月 | ~$12/月 | ~$0/月 |
| **增长期成本** | $50-80/月 | $50-80/月 | $30-60/月 | $25-100/月 |
| **迁移自由度** | 高(开源PG) | 高 | 高 | 低(锁定Google) |
| **冷启动** | 100-200ms | 100-300ms | 1-3s(需常驻) | 200-500ms |
| **定时任务** | Vercel Cron | Vercel Cron | APScheduler | Cloud Scheduler |
| **适合八字算法** | 一般 | 一般 | 最好(Python) | 一般 |
| **长期扩展性** | 好 | 最好 | 好 | 中等 |
| **学习曲线** | 低 | 高(React) | 中 | 低 |

---

## 四、数据库设计（通用，适用于所有方案）

### profiles 表
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,           -- 关联认证系统的 user_id
  nickname TEXT,
  avatar_url TEXT,
  zodiac_sign TEXT,              -- 用户星座 (aries/taurus/...)
  birth_datetime TIMESTAMPTZ,    -- 出生时间（八字/星盘用）
  birth_place TEXT,              -- 出生地点（星盘用）
  subscription TEXT DEFAULT 'free',
  daily_readings_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### reading_history 表
```sql
CREATE TABLE reading_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,             -- 'tarot' / 'zodiac' / 'bazi'
  question TEXT,
  spread_id TEXT,                 -- 牌阵类型
  cards JSONB,                    -- [{name, reversed, position}]
  pattern_analysis JSONB,         -- 模式诊断结果
  elemental_dignities JSONB,      -- 元素尊严分析
  ai_interpretation TEXT,
  ai_model TEXT,                  -- 'claude-3-haiku' 等
  tokens_used INT,                -- 便于成本追踪
  user_feedback TEXT,             -- 'helpful' / 'not_helpful'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### daily_horoscopes 表
```sql
CREATE TABLE daily_horoscopes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  zodiac_sign TEXT NOT NULL,
  period TEXT DEFAULT 'daily',    -- 'daily' / 'weekly' / 'monthly'
  overall TEXT,
  love TEXT,
  career TEXT,
  finance TEXT,
  health TEXT,
  lucky_number INT,
  lucky_color TEXT,
  score INT,                      -- 1-100
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, zodiac_sign, period)
);
```

---

## 五、API 端点设计（通用）

```
认证（根据方案选择 Supabase Auth / Firebase Auth / 自建 JWT）
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/logout
  GET  /api/auth/profile
  PUT  /api/auth/profile

占卜记录
  POST /api/readings              保存占卜结果
  GET  /api/readings              历史列表（分页）
  GET  /api/readings/:id          单条详情

AI 解读（限流：Free 3次/天, VIP 无限）
  POST /api/interpret/tarot       塔罗 AI 解读（支持 SSE 流式）
  POST /api/interpret/zodiac      星座深度解读
  POST /api/interpret/bazi        八字 AI 解读

运势查询
  GET  /api/horoscopes/today/:sign    今日（免登录）
  GET  /api/horoscopes/week/:sign     本周（需登录）
  GET  /api/horoscopes/month/:sign    本月（需登录）

定时生成
  GET  /api/cron/daily-horoscopes     每日 00:00 UTC 触发
  GET  /api/cron/weekly-horoscopes    每周一 00:00 UTC 触发
```

---

## 六、AI 集成设计（通用）

### Prompt 模板

**塔罗解读：**
```
你是「星命阁」的塔罗解读师，融合传统塔罗智慧与现代心理学。

求问者信息：
- 问题：{question}
- 类别：{category}
- 牌阵：{spreadName}（{spreadCount}张）

抽牌结果：
{cards → "位置「过去」: 愚者 (正位)"}

模式诊断：{patternSummary}
元素互动：{elementalDignities}

请提供：
1. 整体能量解读（100字）
2. 各牌位详细解析（每位50-80字）
3. 牌与牌之间的关联故事线（80字）
4. 针对问题的具体建议（60字）
5. 一句核心箴言

风格：温暖但诚实，给出可执行的建议。不说"一切都会好的"这类空话。
```

**每日运势（Cron 批量生成）：**
```
你是星命阁的占星师。为{sign}生成{date}的运势。

输出 JSON：
{
  "overall": "综合运势80字",
  "love": "感情运40字",
  "career": "事业运40字",
  "finance": "财运30字",
  "health": "健康提醒20字",
  "luckyNumber": 数字,
  "luckyColor": "颜色",
  "score": 1-100
}

要求：务实不夸张，包含当天可执行的小建议。
```

### 成本控制策略

| 策略 | 预期节省 | 说明 |
|------|---------|------|
| 每日运势预生成 | 90%+ | 12 星座 × 1 次/天 = 12 次 API 调用，所有用户共享 |
| 相似问题缓存 | 15-25% | Redis 缓存 `md5(cards+question)` → 7 天 TTL |
| 用 Haiku 做运势 | 60% | 模板化内容用小模型，深度解读用 Sonnet |
| 限流 Free 用户 | 控总量 | 3 次/天上限，VIP 无限 |

**月成本估算（1000 日活）：**
- 运势生成：12 次/天 × 30 天 × $0.001 = $0.36
- AI 解读：~3000 次/月 × $0.002 = $6
- **AI 总计：约 $6-7/月**

---

## 七、变现模式参考

参考 Co-Star / The Pattern / AstroTalk 的验证模式：

| 层级 | 功能 | 定价参考 |
|------|------|---------|
| **免费** | 每日运势、单次抽牌（无 AI 解读） | $0 |
| **注册用户** | 历史记录、AI 解读 3 次/天 | $0 |
| **VIP 月卡** | 无限 AI 解读、周/月运势、深度星盘 | ¥18-28/月 |
| **单次付费** | 八字详批、年度运势报告 | ¥9.9/次 |

---

## 八、我的建议

如果现在就要选：

**首选方案 A（Vercel + Supabase）**
- 理由：你的前端是纯 HTML/JS，方案 A 完全不需要改前端，加个 `/api` 目录就能跑后端。零学习曲线，最快出结果。

**未来升级路径：**
- A → B：当功能复杂后，把前端逐步迁移到 Next.js，后端 API 逻辑不变
- A → C：如果需要复杂八字排盘算法，加一个 Python 微服务处理计算密集任务
- A 保持 Supabase 数据库，所有方案切换时数据不丢

**如果你有 Python 基础且重视 AI 深度定制：选方案 C**
**如果你想一劳永逸做成完整产品：投资学 React，选方案 B**
**如果你只想最快上线别折腾：选方案 D (Firebase)**
