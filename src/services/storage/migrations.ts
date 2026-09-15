export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age_label TEXT,
  appearance TEXT,
  personality TEXT,
  backstory TEXT,
  speaking_style TEXT,
  likes TEXT,
  dislikes TEXT,
  rules TEXT,
  boundaries TEXT,
  custom_rules TEXT,
  avatar_assets TEXT,
  baseline_happiness INTEGER DEFAULT 80,
  baseline_affection INTEGER DEFAULT 80,
  baseline_excitement INTEGER DEFAULT 70,
  baseline_energy INTEGER DEFAULT 75,
  baseline_trust INTEGER DEFAULT 80,
  is_active INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  is_pinned INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  thoughts TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  model_used TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  importance INTEGER DEFAULT 5,
  is_permanent INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  source_message_id TEXT,
  access_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_blacklist (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL UNIQUE,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS emotional_states (
  character_id TEXT PRIMARY KEY,
  happiness INTEGER DEFAULT 80,
  affection INTEGER DEFAULT 80,
  excitement INTEGER DEFAULT 70,
  sadness INTEGER DEFAULT 10,
  anger INTEGER DEFAULT 5,
  jealousy INTEGER DEFAULT 10,
  energy INTEGER DEFAULT 80,
  trust INTEGER DEFAULT 80,
  familiarity INTEGER DEFAULT 75,
  intensity REAL DEFAULT 1.0,
  is_enabled INTEGER DEFAULT 1,
  last_updated INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relationship_progress (
  character_id TEXT PRIMARY KEY,
  affinity_points INTEGER DEFAULT 0,
  current_stage_id TEXT NOT NULL,
  stages_json TEXT NOT NULL,
  milestones_json TEXT,
  updated_at INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT,
  model TEXT NOT NULL,
  custom_headers TEXT,
  temperature REAL DEFAULT 0.8,
  top_p REAL DEFAULT 0.95,
  max_tokens INTEGER DEFAULT 2048,
  context_window INTEGER DEFAULT 16000,
  enable_reasoning INTEGER DEFAULT 0,
  reasoning_effort TEXT DEFAULT 'medium',
  timeout_ms INTEGER DEFAULT 45000,
  retry_count INTEGER DEFAULT 2,
  fallback_provider_id TEXT,
  is_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proactive_rules (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  prompt_guidance TEXT NOT NULL,
  inactivity_hours REAL,
  morning_start TEXT,
  morning_end TEXT,
  evening_start TEXT,
  evening_end TEXT,
  quiet_hours_start TEXT DEFAULT '23:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  cooldown_hours REAL DEFAULT 6,
  last_triggered_at INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_char ON memories(character_id, category);
CREATE INDEX IF NOT EXISTS idx_conversations_char ON conversations(character_id, updated_at);
`;
