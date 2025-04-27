-- Create saved_recommendations table
CREATE TABLE IF NOT EXISTS saved_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  emotion TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE saved_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved recommendations" 
ON saved_recommendations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved recommendations" 
ON saved_recommendations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved recommendations" 
ON saved_recommendations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved recommendations" 
ON saved_recommendations FOR DELETE 
USING (auth.uid() = user_id);

-- Create recommendation_feedback table for tracking user feedback
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  recommendation_type TEXT NOT NULL,
  recommendation_content TEXT NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendation feedback" 
ON recommendation_feedback FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation feedback" 
ON recommendation_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);
