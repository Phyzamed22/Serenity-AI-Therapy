-- Add therapy_preferences table to store user's preferred therapy style
CREATE TABLE IF NOT EXISTS therapy_preferences (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  preferred_style TEXT DEFAULT 'balanced',
  communication_preference TEXT DEFAULT 'reflective',
  topics_to_avoid TEXT[],
  helpful_approaches TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add emotional_trends table to track emotional patterns over time
CREATE TABLE IF NOT EXISTS emotional_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  dominant_emotion TEXT NOT NULL,
  emotion_intensity INTEGER CHECK (emotion_intensity BETWEEN 1 AND 10),
  triggers TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhance session_memory table with additional fields
ALTER TABLE session_memory 
ADD COLUMN IF NOT EXISTS therapy_insights JSONB,
ADD COLUMN IF NOT EXISTS identified_patterns JSONB,
ADD COLUMN IF NOT EXISTS coping_strategies JSONB;

-- Add RLS policies
ALTER TABLE therapy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own therapy preferences" 
ON therapy_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own therapy preferences" 
ON therapy_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own therapy preferences" 
ON therapy_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

ALTER TABLE emotional_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emotional trends" 
ON emotional_trends FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotional trends" 
ON emotional_trends FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotional trends" 
ON emotional_trends FOR INSERT 
WITH CHECK (auth.uid() = user_id);
