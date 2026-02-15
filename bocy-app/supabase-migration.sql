-- =============================================
-- BOCY APP — Supabase Database Setup
-- Run this in the Supabase SQL Editor
-- Safe to re-run on existing databases
-- =============================================

-- 1. Create goals table (if not exists)
CREATE TABLE IF NOT EXISTS goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  current_situation text NOT NULL DEFAULT '',
  one_year_goal text NOT NULL DEFAULT '',
  two_year_goal text NOT NULL DEFAULT '',
  target_amount numeric
);

-- 2. Create analyses table (if not exists)
CREATE TABLE IF NOT EXISTS analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  archetype text,
  decision_score numeric,
  monthly_income numeric,
  monthly_spending numeric,
  surplus numeric,
  non_discretionary jsonb,
  discretionary jsonb,
  income_sources jsonb,
  top_move jsonb,
  all_moves jsonb,
  behavioral_patterns jsonb,
  goal_context jsonb
);

-- 3. Add any missing columns (safe to re-run)
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS goal_context jsonb;

-- 4. Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- 5. Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — users can only access their own data
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can read own goals') THEN
    CREATE POLICY "Users can read own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can insert own goals') THEN
    CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can update own goals') THEN
    CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can delete own goals') THEN
    CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'Users can read own analyses') THEN
    CREATE POLICY "Users can read own analyses" ON analyses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'Users can insert own analyses') THEN
    CREATE POLICY "Users can insert own analyses" ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'Users can update own analyses') THEN
    CREATE POLICY "Users can update own analyses" ON analyses FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analyses' AND policyname = 'Users can delete own analyses') THEN
    CREATE POLICY "Users can delete own analyses" ON analyses FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Updated_at trigger for goals
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
