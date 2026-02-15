-- =============================================
-- BOCY APP — Fresh Supabase Database Setup
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Drop existing tables (clears all data)
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS goals CASCADE;

-- 2. Create goals table
CREATE TABLE goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  current_situation text NOT NULL DEFAULT '',
  one_year_goal text NOT NULL DEFAULT '',
  two_year_goal text NOT NULL DEFAULT '',
  target_amount numeric
);

-- 3. Create analyses table
CREATE TABLE analyses (
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

-- 4. Create indexes
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_goals_user_id ON goals(user_id);

-- 5. Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies — users can only access their own data
CREATE POLICY "Users can read own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON analyses FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Updated_at trigger for goals
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Delete all existing auth users (optional — uncomment if you want full reset)
-- WARNING: This deletes ALL users. Only run if you truly want a fresh start.
-- DELETE FROM auth.users;
