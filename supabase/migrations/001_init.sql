-- ============================================================
-- 星命阁 · 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles 表（扩展 Supabase 内置的 auth.users）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        TEXT NOT NULL DEFAULT '神秘访客',
  zodiac_sign     TEXT,                        -- 星座（aries/taurus/...）
  birth_datetime  TIMESTAMPTZ,                 -- 生辰（用于八字）
  is_vip          BOOLEAN NOT NULL DEFAULT FALSE,
  vip_expires_at  TIMESTAMPTZ,
  active_skin_id  TEXT DEFAULT 'default',      -- 当前使用的塔罗牌面皮肤
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 触发器：新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '神秘访客')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 绑定触发器到 auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 2. reading_history 表（占卜历史记录）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,               -- 'tarot' | 'zodiac' | 'bazi'
  question        TEXT,                        -- 用户的问题
  spread_id       TEXT,                        -- 牌阵 ID（塔罗专用）
  cards           JSONB,                       -- 抽到的牌（塔罗专用）
  input_data      JSONB,                       -- 输入数据（星座/八字专用）
  ai_interpretation TEXT,                     -- AI 解读文本
  pattern_summary JSONB,                       -- 模式分析结果
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按用户+时间查询
CREATE INDEX IF NOT EXISTS reading_history_user_id_idx
  ON public.reading_history(user_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. daily_horoscopes 表（每日运势，Cron 写入）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_horoscopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign            TEXT NOT NULL,               -- 星座英文名
  date            DATE NOT NULL,               -- 对应日期（北京时间）
  overall         TEXT NOT NULL,               -- 整体运势
  love            TEXT,                        -- 感情运
  career          TEXT,                        -- 事业运
  wealth          TEXT,                        -- 财运
  health          TEXT,                        -- 健康运
  lucky_number    INT,
  lucky_color     TEXT,
  lucky_direction TEXT,
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sign, date)                           -- 每星座每天只有一条
);

-- 索引：按日期和星座查询
CREATE INDEX IF NOT EXISTS daily_horoscopes_date_sign_idx
  ON public.daily_horoscopes(date, sign);

-- ------------------------------------------------------------
-- 4. RLS（行级安全策略）
-- ------------------------------------------------------------

-- profiles：用户只能读写自己的记录
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "用户可更新自己的profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- reading_history：用户只能读写自己的记录
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可查看自己的占卜记录"
  ON public.reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的占卜记录"
  ON public.reading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可删除自己的占卜记录"
  ON public.reading_history FOR DELETE
  USING (auth.uid() = user_id);

-- daily_horoscopes：所有人可读，只有服务端可写（通过 service_role）
ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可读每日运势"
  ON public.daily_horoscopes FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 执行完成！检查：
-- 1. Table Editor 中应看到 profiles、reading_history、daily_horoscopes
-- 2. Authentication → Triggers 中应看到 on_auth_user_created
-- ============================================================
