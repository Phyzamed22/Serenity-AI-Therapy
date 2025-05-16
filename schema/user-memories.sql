-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  context TEXT,
  importance INTEGER NOT NULL DEFAULT 1,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Create session_memories table
CREATE TABLE IF NOT EXISTS session_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES therapy_sessions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, key)
);

-- Create function to increment memory access count
CREATE OR REPLACE FUNCTION increment_memory_access_count(
  p_user_id UUID,
  p_key TEXT,
  p_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_memories
  SET 
    access_count = access_count + 1,
    last_accessed = p_timestamp
  WHERE 
    user_id = p_user_id AND
    key = p_key;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_memories ENABLE ROW LEVEL SECURITY;

-- User can only access their own memories
CREATE POLICY user_memories_policy ON user_memories
  FOR ALL
  USING (auth.uid() = user_id);

-- User can only access memories from their own sessions
CREATE POLICY session_memories_policy ON session_memories
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM therapy_sessions WHERE user_id = auth.uid()
    )
  );

-- Create index for faster memory retrieval
CREATE INDEX IF NOT EXISTS user_memories_user_id_idx ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS user_memories_importance_idx ON user_memories(user_id, importance);
CREATE INDEX IF NOT EXISTS session_memories_session_id_idx ON session_memories(session_id);
