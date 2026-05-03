-- Create the leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    github_id TEXT NOT NULL,
    username TEXT,
    score INTEGER NOT NULL,
    game_id TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for common queries (Top 10 and Personal Best)
CREATE INDEX IF NOT EXISTS leaderboard_game_id_score_idx ON public.leaderboard (game_id, score DESC);
CREATE INDEX IF NOT EXISTS leaderboard_github_id_idx ON public.leaderboard (github_id);

-- Enable Row Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even logged out users) to see the scores
-- Insertion is handled by the Edge Function using the Service Role, so no INSERT policy is needed for public
CREATE POLICY "Allow public read access" ON public.leaderboard
    FOR SELECT USING (true);