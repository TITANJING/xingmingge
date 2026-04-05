# 星命阁 · 渐进式开发路线图

> 本文档是给 Sonnet 4.6（或任何 AI 助手）的逐步执行指南。
> 每个 Phase 内部按编号顺序执行，不要跳步。每步标注了谁做什么。
> 🤖 = AI 写代码 / 👤 = 用户手动操作 / ✅ = 完成标志

---

## 当前项目状态

```
星命阁/
├── index.html           (719行)   首页·星空渐变风·每日运势·登录弹窗
├── demo.html            (2967行)  星座模块·完整可用
├── tarot-ritual.html    (2619行)  塔罗模块·11种牌阵·AI解读·完整可用
├── data/
│   ├── tarot/           5个JSON   牌义+牌阵+解读技巧+匹配指南
│   └── zodiac/          7个JSON   星座+行星+宫位+相位+兼容性
├── assets/              14张图片   女巫素材+火焰素材(旧版残留)
└── backend-architecture.md        后端方案文档
```

**前端状态：** 三个独立 HTML 文件，纯 Vanilla JS，无构建工具，无框架。
**后端状态：** 无。登录弹窗是纯前端 UI，没有真实认证。每日运势用伪随机生成。

---

## Phase 0：环境准备

> 目标：创建所有需要的账号和密钥，为后续开发扫清障碍。
> 预计耗时：30-60 分钟（全部是用户手动操作）

### 0.1 👤 注册 Supabase
1. 打开 https://supabase.com → Sign Up（用 GitHub 账号最快）
2. 点 "New Project"
3. 项目名：`xingmingge`（星命阁拼音）
4. 数据库密码：设一个强密码并**记下来**
5. Region 选 `Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`（离中国最近）
6. 等 2 分钟初始化完成
7. 进入项目 → Settings → API → 记下这三个值：
   - `Project URL`（形如 `https://xxxxx.supabase.co`）
   - `anon public key`（形如 `eyJhbG...`）
   - `service_role key`（形如 `eyJhbG...` 这个**绝不能暴露到前端**）

✅ 完成标志：能看到 Supabase Dashboard，三个值已记录

### 0.2 👤 注册 Vercel
1. 打开 https://vercel.com → Sign Up（用 GitHub 账号）
2. 暂时不创建项目（等代码准备好后再部署）

✅ 完成标志：能看到 Vercel Dashboard

### 0.3 👤 获取 Anthropic API Key
1. 打开 https://console.anthropic.com → 注册/登录
2. Settings → API Keys → Create Key
3. 记下 Key（形如 `sk-ant-api03-...`）
4. 充值 $5（够用 2500+ 次占卜解读）

✅ 完成标志：拥有一个可用的 Claude API Key

### 0.4 👤 注册 Upstash（Redis 缓存）
1. 打开 https://console.upstash.com → Sign Up
2. 创建 Redis Database → Region: `ap-southeast-1`
3. 记下 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

✅ 完成标志：四个服务的凭证全部到手

### 0.5 👤 把凭证告诉 AI
> 在对话中发送所有凭证（不含 service_role key 之外的其他密钥也行）。
> AI 会把它们写入 `.env` 和 Vercel 环境变量，不会存入代码或 Git。

---

## Phase 1：后端基础搭建（方案 A）

> 目标：在现有 HTML 项目旁边加入 Vercel Serverless 后端，实现真实的用户认证。
> 前端暂不改动。
> 预计耗时：🤖 1天

### 1.1 🤖 项目初始化
1. 在项目根目录初始化 Node.js 项目：
   ```
   npm init -y
   npm install typescript @types/node --save-dev
   npm install @supabase/supabase-js @anthropic-ai/sdk @upstash/redis
   ```
2. 创建 `tsconfig.json`（target: ES2020, module: ESNext）
3. 创建 `vercel.json`：
   ```json
   {
     "buildCommand": "",
     "outputDirectory": ".",
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" }
     ],
     "crons": [
       { "path": "/api/cron/daily-horoscopes", "schedule": "0 16 * * *" }
     ]
   }
   ```
   > schedule 说明：UTC 16:00 = 北京时间 00:00
4. 创建 `.env.local`（本地开发用，加入 .gitignore）：
   ```
   SUPABASE_URL=用户提供的值
   SUPABASE_ANON_KEY=用户提供的值
   SUPABASE_SERVICE_ROLE_KEY=用户提供的值
   ANTHROPIC_API_KEY=用户提供的值
   UPSTASH_REDIS_REST_URL=用户提供的值
   UPSTASH_REDIS_REST_TOKEN=用户提供的值
   CRON_SECRET=随机生成一个32位字符串
   ```
5. 创建 `.gitignore`：
   ```
   node_modules/
   .env.local
   .vercel/
   ```

✅ 完成标志：`npm install` 成功，`tsconfig.json` 存在，`.env.local` 已配置

### 1.2 🤖 创建公共库文件
创建 `lib/` 目录，包含以下文件：

**`lib/supabase.ts`** — Supabase 客户端（分 anon 和 admin 两个实例）
**`lib/claude.ts`** — Claude API 封装（含流式和非流式两种调用）
**`lib/redis.ts`** — Upstash Redis 封装（缓存读写 + TTL）
**`lib/auth.ts`** — JWT 验证中间件（从 Authorization header 提取 token，调 supabase.auth.getUser）
**`lib/rate-limit.ts`** — 限流逻辑（Redis 计数器，Free 3次/天，VIP 无限）
**`lib/response.ts`** — 统一响应格式 `{ ok, data, error }`

✅ 完成标志：所有 lib 文件编写完毕，无 TypeScript 类型报错

### 1.3 🤖 Supabase 建表
编写 SQL 迁移脚本 `supabase/migrations/001_init.sql`：

```sql
-- profiles 表（扩展 Supabase auth.users）
CREATE TABLE profiles ( ... );

-- 创建触发器：新用户注册时自动在 profiles 建记录
CREATE FUNCTION public.handle_new_user() ...
CREATE TRIGGER on_auth_user_created ...

-- reading_history 表
CREATE TABLE reading_history ( ... );

-- daily_horoscopes 表
CREATE TABLE daily_horoscopes ( ... );

-- RLS 策略：用户只能读写自己的数据
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_horoscopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... ;
```

> 👤 用户操作：把 SQL 复制到 Supabase Dashboard → SQL Editor → Run

✅ 完成标志：Supabase 中看到 3 张表 + RLS 策略

### 1.4 🤖 认证 API
创建以下 Vercel Serverless Functions：

**`api/auth/register.ts`**
- POST 请求，接收 `{ email, password, nickname }`
- 调用 `supabase.auth.signUp()`
- 返回 `{ access_token, refresh_token, user }`

**`api/auth/login.ts`**
- POST 请求，接收 `{ email, password }`
- 调用 `supabase.auth.signInWithPassword()`
- 返回 token

**`api/auth/profile.ts`**
- GET: 验证 JWT → 查 profiles 表返回用户资料
- PUT: 验证 JWT → 更新 nickname/zodiac_sign/birth_datetime

✅ 完成标志：用 curl 或 Postman 能注册、登录、获取 profile

### 1.5 🤖 前端对接登录
修改 `index.html` 中现有的登录/注册弹窗：
- 注册表单 submit → `fetch('/api/auth/register', ...)`
- 登录表单 submit → `fetch('/api/auth/login', ...)`
- 登录成功 → `localStorage.setItem('token', ...)` + 更新 UI 显示昵称
- 页面加载 → 检查 token 是否存在 → 自动刷新用户状态
- 退出 → 清除 token + 恢复未登录 UI

> 注意：这一步只改 index.html 中已有的登录弹窗 JS 逻辑，不改页面结构。

✅ 完成标志：能在网页上注册新账号、登录、看到昵称、退出

### 1.6 👤 + 🤖 部署到 Vercel
1. 👤 在项目根目录 `git init` + `git add .` + `git commit`
2. 👤 推送到 GitHub（新建一个 repo）
3. 👤 在 Vercel Dashboard → Import → 选这个 GitHub repo
4. 🤖 提供 Vercel 环境变量配置清单（用户在 Vercel Settings → Environment Variables 中逐个填入）
5. 👤 点 Deploy

✅ 完成标志：`https://你的域名.vercel.app` 能正常打开，登录功能可用

---

## Phase 2：核心后端功能

> 目标：AI 占卜解读 + 历史记录 + 每日运势。前端做最小修改。
> 预计耗时：🤖 1-2天

### 2.1 🤖 AI 解读 API
**`api/interpret/tarot.ts`**
- POST，需 JWT
- 接收 `{ question, category, spreadId, cards[], patternSummary, elementalDignities }`
- 限流检查（Redis）
- 构建 Prompt → 调用 Claude API（claude-3-haiku 用于快速解读）
- 缓存结果到 Redis（key = md5(cards+question), TTL 7天）
- 返回解读文本（支持 SSE 流式）

**`api/interpret/zodiac.ts`** — 类似结构，输入改为星座+生日+问题
**`api/interpret/bazi.ts`** — 预留，后续实现

✅ 完成标志：POST 塔罗数据 → 返回 AI 解读文本

### 2.2 🤖 tarot-ritual.html 对接 AI
修改 tarot-ritual.html 中已有的 AI 解读功能：
- 现有的 `buildPatternAnalysis()` 结果作为 AI 输入
- 翻牌完成后新增"AI 深度解读"按钮
- 点击 → `fetch('/api/interpret/tarot', ...)` 带 JWT
- 流式展示 AI 回复（用 EventSource 或 ReadableStream）
- 未登录 → 提示"登录后解锁 AI 解读"

> 注意：只在现有 JS 中加一个函数和一个按钮，不重构页面。

✅ 完成标志：塔罗翻牌后能看到 AI 逐字输出的个性化解读

### 2.3 🤖 占卜记录 API
**`api/readings/index.ts`**
- POST: 保存一条占卜记录（含牌面+AI解读），需 JWT
- GET: 分页获取历史列表（`?page=1&limit=20`），需 JWT

**`api/readings/[id].ts`**
- GET: 获取单条详情，需 JWT + 验证 user_id 所有权

✅ 完成标志：占卜完自动保存，能在某个地方查看历史

### 2.4 🤖 index.html 加"我的记录"入口
在首页导航栏或用户菜单中加一个"历史记录"入口：
- 点击 → 展开一个记录列表面板（用现有弹窗风格）
- 每条显示：日期、类型（塔罗/星座）、问题摘要
- 点击某条 → 跳转到详情或展开查看

> 注意：还是在 index.html 里加，保持风格一致。

✅ 完成标志：登录用户能看到自己的占卜历史

### 2.5 🤖 每日运势 Cron + API
**`api/cron/daily-horoscopes.ts`**
- GET，验证 CRON_SECRET
- 循环 12 星座 → 调用 Claude (Haiku) 生成运势 → 存入 daily_horoscopes 表
- 每日北京时间 00:00 自动运行（Vercel Cron）

**`api/horoscopes/today/[sign].ts`**
- GET，无需登录
- 查 daily_horoscopes 表当天数据
- 若无数据（首次或 Cron 失败）→ 实时生成并存入

### 2.6 🤖 index.html 对接真实运势
替换首页 `dailySeed()` 伪随机运势：
- 页面加载 → `fetch('/api/horoscopes/today/${sign}')`
- 展示真实 AI 生成的运势内容
- 保留星座选择器和 UI，只替换数据来源

✅ 完成标志：首页运势是 AI 生成的真实内容，每天不同，所有用户看到同一内容

---

## Phase 3：Next.js 迁移启动

> 目标：引入 Next.js 框架，把现有 HTML 页面放入 public/ 保持可用，
> 新页面用 React 组件编写。两者共存，逐步过渡。
> 预计耗时：🤖 1-2天（搭框架 + 迁移首页）

### 3.1 🤖 Next.js 项目结构改造
```
星命阁/
├── app/                    ← NEW: Next.js App Router
│   ├── layout.tsx          全局布局（星空背景+导航栏）
│   ├── page.tsx            新首页（React 版）
│   ├── globals.css         全局样式
│   └── api/                API Routes（从 Phase 1 的 api/ 迁移过来）
│       ├── auth/
│       ├── interpret/
│       ├── readings/
│       ├── horoscopes/
│       └── cron/
├── components/             ← NEW: React 组件库
│   ├── StarryBackground.tsx   星空背景（复用现有 canvas 逻辑）
│   ├── Navbar.tsx             导航栏
│   ├── LoginModal.tsx         登录/注册弹窗
│   ├── DailyHoroscope.tsx     每日运势卡片
│   └── ModuleCard.tsx         功能模块卡片
├── lib/                    共享后端库（不变）
├── public/                 ← 现有 HTML 文件移到这里
│   ├── demo.html           星座模块（暂不迁移，直接可访问）
│   ├── tarot-ritual.html   塔罗模块（暂不迁移，直接可访问）
│   ├── data/               JSON 数据文件
│   └── assets/             图片资源
├── next.config.js
├── package.json
└── tsconfig.json
```

**关键点：**
- `demo.html` 和 `tarot-ritual.html` 放在 `public/` 里，访问 `/demo.html` 和 `/tarot-ritual.html` 依然能直接打开
- 新的 Next.js 首页 `app/page.tsx` 替代旧 `index.html`
- API Routes 从 `api/` 目录迁移到 `app/api/`，代码逻辑不变
- 导航栏中"星座"和"塔罗"链接指向 `/demo.html` 和 `/tarot-ritual.html`（指向 public 里的旧页面）

### 3.2 🤖 迁移首页到 React
把 `index.html` 的功能拆分为 React 组件：
- `StarryBackground` — canvas 星空动画
- `Navbar` — 导航栏 + 登录状态
- `LoginModal` — 登录/注册弹窗（用 Supabase Auth Client SDK）
- `DailyHoroscope` — 每日运势（fetch 真实 API）
- `ModuleCard` — 三个功能模块入口卡片

> 旧 `index.html` 移到 `public/index-legacy.html` 做备份。

✅ 完成标志：新 Next.js 首页视觉效果与旧版一致，所有功能正常

### 3.3 🤖 + 👤 重新部署
1. 🤖 更新 `package.json` 的 build script 为 `next build`
2. 🤖 更新 `vercel.json` 适配 Next.js
3. 👤 git push → Vercel 自动重新部署

✅ 完成标志：线上站点正常运行，新首页 + 旧塔罗/星座页面共存

---

## Phase 4：商城系统

> 目标：在 Next.js 中新建商城页面，支持虚拟商品（塔罗牌面皮肤）和实物商品。
> 预计耗时：🤖 2-3天

### 4.1 🤖 数据库扩展
```sql
-- 商品表
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,         -- 'skin' / 'physical' / 'reading_pack'
  price_cents INT NOT NULL,   -- 分为单位 (1999 = ¥19.99)
  currency TEXT DEFAULT 'CNY',
  image_url TEXT,
  preview_data JSONB,         -- 皮肤类：包含牌面预览图URLs
  stock INT,                  -- 实物商品库存，虚拟为 null
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 用户购买/库存表
CREATE TABLE user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  order_id TEXT,              -- 支付订单号
  UNIQUE(user_id, product_id) -- 虚拟商品不重复购买
);

-- 订单表
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  items JSONB NOT NULL,       -- [{product_id, quantity, price}]
  total_cents INT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending/paid/shipped/completed/refunded
  payment_method TEXT,        -- 'wechat' / 'alipay' / 'stripe'
  payment_id TEXT,            -- 第三方支付流水号
  shipping_info JSONB,        -- 实物：{name, phone, address}
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 🤖 商城页面
```
app/shop/
├── page.tsx                商城首页（商品网格）
├── [productId]/page.tsx    商品详情页
├── cart/page.tsx           购物车
└── orders/page.tsx         我的订单
```

- 商品卡片组件 → 图片 + 名称 + 价格 + 购买按钮
- 牌面皮肤商品 → 点击可预览效果（展示几张示例塔罗牌的新皮肤）
- 购物车用 React Context 状态管理（不需要后端存购物车）
- 下单 API → 创建 orders 记录 → 返回支付链接

### 4.3 🤖 支付接口（预留）
```
api/payment/create.ts       创建支付订单 → 返回支付二维码/链接
api/payment/webhook.ts      接收支付回调 → 更新订单状态 → 发放虚拟商品
```

> 支付对接（微信支付/支付宝）需要 👤 申请商户号，这一步先做好接口骨架，
> 用"模拟支付"按钮测试整个流程，真实支付等商户号下来后接入。

### 4.4 🤖 牌面皮肤系统
- `profiles` 表添加 `active_skin_id` 字段
- `tarot-ritual.html`（或后续迁移后的塔罗组件）读取用户当前皮肤
- 牌面图片路径改为：`/assets/skins/${skinId}/${cardId}.webp`
- 默认皮肤免费，购买后在"我的库存"中切换

✅ 完成标志：能浏览商品、模拟购买、切换塔罗牌面皮肤

---

## Phase 5：塔罗页面迁移到 React

> 目标：把 tarot-ritual.html 迁移为 Next.js 页面，为女巫宠物做准备。
> 预计耗时：🤖 3-4天（最大的一次迁移）

### 5.1 🤖 拆分塔罗组件
```
app/tarot/
├── page.tsx                入口页（选牌阵+提问）
├── reading/page.tsx        翻牌+解读页
└── history/page.tsx        塔罗历史记录

components/tarot/
├── SpreadSelector.tsx      牌阵选择器（11种牌阵）
├── QuestionInput.tsx       问题输入 + 分类选择
├── CardTable.tsx           牌桌（GSAP翻牌动画）
├── TarotCard.tsx           单张塔罗牌（支持皮肤）
├── PatternAnalysis.tsx     模式诊断面板
├── ElementalDignity.tsx    元素尊严分析
├── JourneyAnalysis.tsx     愚者旅程分析
├── AIInterpretation.tsx    AI解读面板（流式输出）
└── ReadingSummary.tsx      整体结果汇总
```

### 5.2 🤖 迁移核心逻辑
- MAJOR_ARCANA / MINOR_ARCANA 数据 → 改为从 JSON fetch 加载
- SPREADS 配置 → 独立 `data/spreads-config.ts`
- 翻牌动画 → GSAP 在 React 中用 `useRef` + `useLayoutEffect`
- 模式诊断 → 复用现有逻辑，封装为 `usePatternAnalysis()` hook
- AI 解读 → 用 `useChat()` from Vercel AI SDK（流式对话）

### 5.3 🤖 删除 public/tarot-ritual.html
导航栏中"塔罗"链接改为 `/tarot`（指向新 React 页面）

✅ 完成标志：新塔罗页面功能完整，与旧版视觉一致，翻牌动画流畅

---

## Phase 6：AI 女巫宠物

> 目标：在页面底部添加一个 Q版女巫 AI 角色，能对话、解读、引导消费。
> 预计耗时：🤖 2-3天

### 6.1 🤖 女巫组件
```
components/witch/
├── WitchPet.tsx            主组件（浮动在页面底部）
├── WitchAvatar.tsx         Q版女巫形象（CSS动画：idle/talking/excited）
├── ChatBubble.tsx          对话气泡
├── ChatPanel.tsx           展开的聊天面板
└── WitchPrompts.ts         女巫人格 Prompt 模板
```

**交互设计：**
- 默认状态：页面右下角悬浮一个 Q版女巫头像，偶尔眨眼/摇晃
- 点击 → 展开聊天面板（类似客服弹窗）
- 女巫有自己的人格 Prompt："你是星命阁的小女巫「星灵」，性格活泼..."
- 占卜结束后 → 女巫自动冒出气泡："要我帮你深度解读一下吗？✨"
- 浏览商城时 → "这套「月光塔罗」牌面超好看的，好多人都在用哦~"

### 6.2 🤖 女巫 AI 后端
**`api/witch/chat.ts`**
- POST，需 JWT
- 接收 `{ message, context }` — context 包含当前页面、最近占卜结果等
- System Prompt 包含女巫人格 + 当前上下文 + 商品推荐指令
- 流式返回

**对话上下文策略：**
- 聊天记录存 sessionStorage（不持久化，减少存储成本）
- 最近 10 条消息作为上下文发送
- 自动注入"场景上下文"：
  - 在塔罗页面 → 注入最近抽牌结果
  - 在商城页面 → 注入当前浏览的商品信息
  - 在首页 → 注入今日运势

### 6.3 🤖 消费引导逻辑
女巫的 System Prompt 中包含柔性引导规则：
- Free 用户用完 3 次 AI 解读后 → "今天的解读次数用完啦~ 开通 VIP 就能无限解读哦 💫"
- 浏览塔罗牌面时 → 介绍皮肤特点
- 闲聊时偶尔 → "对了，你看过我们新到的水晶吊坠吗？据说能增强直觉力哦~"
- **原则：不超过每 5 条消息引导一次，避免引起反感**

✅ 完成标志：Q版女巫能对话、能基于场景推荐、有性格特色

---

## Phase 7：星座页面迁移 + 八字模块

> 目标：把 demo.html 迁移到 React，新建八字算命模块。
> 预计耗时：🤖 3-4天

### 7.1 🤖 迁移星座页面
```
app/zodiac/
├── page.tsx               星座主页
├── [sign]/page.tsx        单个星座详情
└── compatibility/page.tsx 星座配对
```

### 7.2 🤖 八字模块
```
app/bazi/
├── page.tsx               输入生辰
└── result/page.tsx        八字排盘结果 + AI解读
```

- 八字排盘算法：天干地支计算、五行分析、十神关系
- AI 解读：把排盘结果传给 Claude 做人生解读
- 这里 Python 天文计算库更强，但 JS 也有 `lunar-javascript` 等库可用

### 7.3 🤖 删除 public/demo.html
导航栏"星座"链接改为 `/zodiac`

✅ 完成标志：全站已完全迁移为 Next.js，public/ 中不再有旧 HTML

---

## Phase 8：精细化运营功能

> 目标：VIP 系统、推送通知、SEO 优化等商业化功能。
> 视需求选做。

### 8.1 VIP 订阅系统
- 月卡/年卡/单次付费
- Stripe 或微信支付接入
- VIP 特权：无限 AI 解读、周/月运势、专属牌面

### 8.2 邮件/推送通知
- 每日运势邮件推送（Resend / SendGrid）
- 浏览器 Web Push 通知

### 8.3 SEO 优化
- Next.js SSR/SSG 生成星座详情页 → Google 收录
- 每日运势页面静态化 → ISR 缓存
- 结构化数据标记（JSON-LD）

### 8.4 数据分析
- 用户行为追踪（哪些牌阵最受欢迎、AI 解读满意度）
- A/B 测试女巫的推荐话术

---

## 时间线总览

```
Phase 0  环境准备         👤 30分钟     ──────
Phase 1  后端基础         🤖 1天       ════════
Phase 2  核心后端         🤖 1-2天     ════════════
Phase 3  Next.js 引入     🤖 1-2天     ════════════
Phase 4  商城系统         🤖 2-3天     ════════════════
Phase 5  塔罗迁移         🤖 3-4天     ════════════════════
Phase 6  AI 女巫          🤖 2-3天     ════════════════
Phase 7  星座+八字迁移    🤖 3-4天     ════════════════════
Phase 8  运营功能         🤖 按需       ··················

总计：约 15-22 个工作日（Phase 0-7）
```

**每个 Phase 结束后都可以部署上线，用户能看到新功能。**
**不需要等全部做完才上线。**
