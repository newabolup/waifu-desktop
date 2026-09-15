import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { SCHEMA_SQL } from './migrations';
import {
  DEFAULT_CHARACTER,
  DEFAULT_RELATIONSHIP,
  DEFAULT_EMOTIONS,
  DEFAULT_PROVIDERS,
  DEFAULT_PROACTIVE_RULES,
  DEFAULT_APP_SETTINGS,
} from './defaults';
import { CharacterProfile } from '../../types/character';
import { ConversationSession, ChatMessage } from '../../types/conversation';
import { MemoryItem, NegativeMemoryRule, MemoryFilter } from '../../types/memory';
import { EmotionalState } from '../../types/emotion';
import { RelationshipProgress } from '../../types/relationship';
import { AIProviderConfig } from '../../types/provider';
import { ProactiveRule } from '../../types/proactive';
import { AppSettings } from '../../types/settings';

export class StorageService {
  private static instance: StorageService;
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.SQL = await initSqlJs({
          locateFile: (file) => {
            // For Node/test or Vite/Electron
            if (typeof window === 'undefined') {
              return require('path').join(__dirname, '../../../public', file);
            }
            return `./${file}`;
          },
        });

        // Try to load existing database bytes from electronAPI or localStorage
        let existingData: Uint8Array | null = null;

        if (typeof window !== 'undefined' && (window as any).electronAPI?.loadDatabase) {
          try {
            const buf = await (window as any).electronAPI.loadDatabase();
            if (buf && buf.length > 0) {
              existingData = new Uint8Array(buf);
            }
          } catch (err) {
            console.warn('Could not load database from electronAPI, checking fallback:', err);
          }
        }

        if (!existingData && typeof localStorage !== 'undefined') {
          const b64 = localStorage.getItem('kizuna_sqlite_db');
          if (b64) {
            try {
              const bin = atob(b64);
              existingData = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) {
                existingData[i] = bin.charCodeAt(i);
              }
            } catch (err) {
              console.warn('Error reading localStorage database:', err);
            }
          }
        }

        if (existingData) {
          this.db = new this.SQL.Database(existingData);
        } else {
          this.db = new this.SQL.Database();
          this.db.run(SCHEMA_SQL);
          await this.populateDefaults();
          this.persist();
        }

        // Ensure schemas exist even if loaded from older database
        this.db.run(SCHEMA_SQL);
        this.isInitialized = true;
      } catch (err) {
        console.error('Failed to initialize SQLite database:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  public persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveDatabase) {
        (window as any).electronAPI.saveDatabase(data);
      } else if (typeof localStorage !== 'undefined') {
        // Fallback store in localStorage
        let binary = '';
        const len = data.byteLength;
        // Chunked string conversion to prevent stack overflow
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = data.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, chunk as any);
        }
        localStorage.setItem('kizuna_sqlite_db', btoa(binary));
      }
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  private async populateDefaults(): Promise<void> {
    if (!this.db) return;

    // Default Character
    await this.saveCharacter(DEFAULT_CHARACTER);

    // Default Relationship Progress
    await this.saveRelationshipProgress(DEFAULT_RELATIONSHIP);

    // Default Emotional State
    await this.saveEmotionalState(DEFAULT_EMOTIONS);

    // Default Providers
    for (const prov of DEFAULT_PROVIDERS) {
      await this.saveProvider(prov);
    }

    // Default Proactive Rules
    for (const rule of DEFAULT_PROACTIVE_RULES) {
      await this.saveProactiveRule(rule);
    }

    // Default Settings
    await this.saveSettings(DEFAULT_APP_SETTINGS);
  }

  // ==========================================
  // CHARACTER OPERATIONS
  // ==========================================

  public async getCharacters(): Promise<CharacterProfile[]> {
    await this.init();
    const res = this.db!.exec('SELECT * FROM characters ORDER BY updated_at DESC');
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        name: obj.name,
        ageLabel: obj.age_label || '',
        appearance: obj.appearance || '',
        personality: obj.personality || '',
        backstory: obj.backstory || '',
        speakingStyle: obj.speaking_style || '',
        likes: JSON.parse(obj.likes || '[]'),
        dislikes: JSON.parse(obj.dislikes || '[]'),
        rules: JSON.parse(obj.rules || '[]'),
        boundaries: JSON.parse(obj.boundaries || '[]'),
        customRules: JSON.parse(obj.custom_rules || '[]'),
        avatarAssets: JSON.parse(obj.avatar_assets || '{}'),
        baselineHappiness: obj.baseline_happiness ?? 80,
        baselineAffection: obj.baseline_affection ?? 80,
        baselineExcitement: obj.baseline_excitement ?? 70,
        baselineEnergy: obj.baseline_energy ?? 75,
        baselineTrust: obj.baseline_trust ?? 80,
        isActive: Boolean(obj.is_active),
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
      };
    });
  }

  public async getCharacterById(id: string): Promise<CharacterProfile | null> {
    const list = await this.getCharacters();
    return list.find((c) => c.id === id) || null;
  }

  public async getActiveCharacter(): Promise<CharacterProfile> {
    const list = await this.getCharacters();
    const active = list.find((c) => c.isActive);
    return active || list[0] || DEFAULT_CHARACTER;
  }

  public async saveCharacter(char: CharacterProfile): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO characters (
        id, name, age_label, appearance, personality, backstory, speaking_style,
        likes, dislikes, rules, boundaries, custom_rules, avatar_assets,
        baseline_happiness, baseline_affection, baseline_excitement, baseline_energy, baseline_trust,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, age_label=excluded.age_label, appearance=excluded.appearance,
        personality=excluded.personality, backstory=excluded.backstory, speaking_style=excluded.speaking_style,
        likes=excluded.likes, dislikes=excluded.dislikes, rules=excluded.rules,
        boundaries=excluded.boundaries, custom_rules=excluded.custom_rules, avatar_assets=excluded.avatar_assets,
        baseline_happiness=excluded.baseline_happiness, baseline_affection=excluded.baseline_affection,
        baseline_excitement=excluded.baseline_excitement, baseline_energy=excluded.baseline_energy,
        baseline_trust=excluded.baseline_trust, is_active=excluded.is_active, updated_at=excluded.updated_at
    `;
    this.db!.run(query, [
      char.id,
      char.name,
      char.ageLabel || '',
      char.appearance || '',
      char.personality || '',
      char.backstory || '',
      char.speakingStyle || '',
      JSON.stringify(char.likes || []),
      JSON.stringify(char.dislikes || []),
      JSON.stringify(char.rules || []),
      JSON.stringify(char.boundaries || []),
      JSON.stringify(char.customRules || []),
      JSON.stringify(char.avatarAssets || {}),
      char.baselineHappiness ?? 80,
      char.baselineAffection ?? 80,
      char.baselineExcitement ?? 70,
      char.baselineEnergy ?? 75,
      char.baselineTrust ?? 80,
      char.isActive ? 1 : 0,
      char.createdAt || Date.now(),
      Date.now(),
    ]);
    this.persist();
  }

  public async deleteCharacter(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM characters WHERE id = ?', [id]);
    this.persist();
  }

  // ==========================================
  // CONVERSATION & MESSAGE OPERATIONS
  // ==========================================

  public async getConversations(characterId?: string): Promise<ConversationSession[]> {
    await this.init();
    const query = characterId
      ? 'SELECT * FROM conversations WHERE character_id = ? ORDER BY is_pinned DESC, updated_at DESC'
      : 'SELECT * FROM conversations ORDER BY is_pinned DESC, updated_at DESC';
    const params = characterId ? [characterId] : [];
    const res = this.db!.exec(query, params);
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        characterId: obj.character_id,
        title: obj.title,
        summary: obj.summary || '',
        isPinned: Boolean(obj.is_pinned),
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
      };
    });
  }

  public async saveConversation(conv: ConversationSession): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO conversations (id, character_id, title, summary, is_pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, summary=excluded.summary, is_pinned=excluded.is_pinned, updated_at=excluded.updated_at
    `;
    this.db!.run(query, [
      conv.id,
      conv.characterId,
      conv.title,
      conv.summary || '',
      conv.isPinned ? 1 : 0,
      conv.createdAt,
      conv.updatedAt || Date.now(),
    ]);
    this.persist();
  }

  public async deleteConversation(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    this.db!.run('DELETE FROM conversations WHERE id = ?', [id]);
    this.persist();
  }

  public async getMessages(conversationId: string): Promise<ChatMessage[]> {
    await this.init();
    const res = this.db!.exec(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        conversationId: obj.conversation_id,
        role: obj.role,
        content: obj.content,
        thoughts: obj.thoughts || undefined,
        tokensUsed: obj.tokens_used || undefined,
        latencyMs: obj.latency_ms || undefined,
        modelUsed: obj.model_used || undefined,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
      };
    });
  }

  public async saveMessage(msg: ChatMessage): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO messages (id, conversation_id, role, content, thoughts, tokens_used, latency_ms, model_used, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content=excluded.content, thoughts=excluded.thoughts, tokens_used=excluded.tokens_used,
        latency_ms=excluded.latency_ms, model_used=excluded.model_used, updated_at=excluded.updated_at
    `;
    this.db!.run(query, [
      msg.id,
      msg.conversationId,
      msg.role,
      msg.content,
      msg.thoughts || '',
      msg.tokensUsed || 0,
      msg.latencyMs || 0,
      msg.modelUsed || '',
      msg.createdAt,
      msg.updatedAt || Date.now(),
    ]);

    // Touch conversation updated_at
    this.db!.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [
      Date.now(),
      msg.conversationId,
    ]);
    this.persist();
  }

  public async deleteMessage(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM messages WHERE id = ?', [id]);
    this.persist();
  }

  // ==========================================
  // MEMORY OPERATIONS
  // ==========================================

  public async getMemories(characterId?: string, filter?: MemoryFilter): Promise<MemoryItem[]> {
    await this.init();
    let query = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];

    if (characterId) {
      query += ' AND character_id = ?';
      params.push(characterId);
    }
    if (filter?.category && filter.category !== 'all') {
      query += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.isPinned !== undefined) {
      query += ' AND is_pinned = ?';
      params.push(filter.isPinned ? 1 : 0);
    }
    if (filter?.isPermanent !== undefined) {
      query += ' AND is_permanent = ?';
      params.push(filter.isPermanent ? 1 : 0);
    }
    if (filter?.query) {
      query += ' AND content LIKE ?';
      params.push(`%${filter.query}%`);
    }

    query += ' ORDER BY is_pinned DESC, is_permanent DESC, importance DESC, created_at DESC';

    const res = this.db!.exec(query, params);
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        characterId: obj.character_id,
        category: obj.category,
        content: obj.content,
        confidence: obj.confidence ?? 1.0,
        importance: obj.importance ?? 5,
        isPermanent: Boolean(obj.is_permanent),
        isPinned: Boolean(obj.is_pinned),
        sourceMessageId: obj.source_message_id || undefined,
        accessCount: obj.access_count ?? 0,
        lastAccessedAt: obj.last_accessed_at || undefined,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
      };
    });
  }

  public async saveMemory(mem: MemoryItem): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO memories (
        id, character_id, category, content, confidence, importance,
        is_permanent, is_pinned, source_message_id, access_count, last_accessed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category=excluded.category, content=excluded.content, confidence=excluded.confidence,
        importance=excluded.importance, is_permanent=excluded.is_permanent, is_pinned=excluded.is_pinned,
        access_count=excluded.access_count, last_accessed_at=excluded.last_accessed_at, updated_at=excluded.updated_at
    `;
    this.db!.run(query, [
      mem.id,
      mem.characterId,
      mem.category,
      mem.content,
      mem.confidence ?? 1.0,
      mem.importance ?? 5,
      mem.isPermanent ? 1 : 0,
      mem.isPinned ? 1 : 0,
      mem.sourceMessageId || '',
      mem.accessCount || 0,
      mem.lastAccessedAt || null,
      mem.createdAt || Date.now(),
      Date.now(),
    ]);
    this.persist();
  }

  public async touchMemoriesAccess(memoryIds: string[]): Promise<void> {
    if (!memoryIds.length) return;
    await this.init();
    const now = Date.now();
    for (const id of memoryIds) {
      this.db!.run(
        'UPDATE memories SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?',
        [now, id]
      );
    }
    this.persist();
  }

  public async deleteMemory(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM memories WHERE id = ?', [id]);
    this.persist();
  }

  // Memory Blacklist / Negative Filters
  public async getBlacklistRules(): Promise<NegativeMemoryRule[]> {
    await this.init();
    const res = this.db!.exec('SELECT * FROM memory_blacklist ORDER BY created_at DESC');
    if (!res.length) return [];

    return res[0].values.map((row) => ({
      id: row[0] as string,
      pattern: row[1] as string,
      createdAt: row[2] as number,
    }));
  }

  public async saveBlacklistRule(rule: NegativeMemoryRule): Promise<void> {
    await this.init();
    this.db!.run(
      'INSERT OR REPLACE INTO memory_blacklist (id, pattern, created_at) VALUES (?, ?, ?)',
      [rule.id, rule.pattern, rule.createdAt || Date.now()]
    );
    this.persist();
  }

  public async deleteBlacklistRule(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM memory_blacklist WHERE id = ?', [id]);
    this.persist();
  }

  // ==========================================
  // EMOTIONAL STATE OPERATIONS
  // ==========================================

  public async getEmotionalState(characterId: string): Promise<EmotionalState> {
    await this.init();
    const res = this.db!.exec('SELECT * FROM emotional_states WHERE character_id = ?', [
      characterId,
    ]);
    if (!res.length || !res[0].values.length) {
      return { ...DEFAULT_EMOTIONS, characterId };
    }

    const row = res[0].values[0];
    const cols = res[0].columns;
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      characterId: obj.character_id,
      happiness: obj.happiness ?? 80,
      affection: obj.affection ?? 80,
      excitement: obj.excitement ?? 70,
      sadness: obj.sadness ?? 10,
      anger: obj.anger ?? 5,
      jealousy: obj.jealousy ?? 10,
      energy: obj.energy ?? 80,
      trust: obj.trust ?? 80,
      familiarity: obj.familiarity ?? 75,
      intensity: obj.intensity ?? 1.0,
      isEnabled: Boolean(obj.is_enabled),
      lastUpdated: obj.last_updated || Date.now(),
    };
  }

  public async saveEmotionalState(state: EmotionalState): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO emotional_states (
        character_id, happiness, affection, excitement, sadness, anger, jealousy,
        energy, trust, familiarity, intensity, is_enabled, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
        happiness=excluded.happiness, affection=excluded.affection, excitement=excluded.excitement,
        sadness=excluded.sadness, anger=excluded.anger, jealousy=excluded.jealousy,
        energy=excluded.energy, trust=excluded.trust, familiarity=excluded.familiarity,
        intensity=excluded.intensity, is_enabled=excluded.is_enabled, last_updated=excluded.last_updated
    `;
    this.db!.run(query, [
      state.characterId,
      state.happiness,
      state.affection,
      state.excitement,
      state.sadness,
      state.anger,
      state.jealousy,
      state.energy,
      state.trust,
      state.familiarity,
      state.intensity ?? 1.0,
      state.isEnabled ? 1 : 0,
      Date.now(),
    ]);
    this.persist();
  }

  // ==========================================
  // RELATIONSHIP PROGRESSION OPERATIONS
  // ==========================================

  public async getRelationshipProgress(characterId: string): Promise<RelationshipProgress> {
    await this.init();
    const res = this.db!.exec('SELECT * FROM relationship_progress WHERE character_id = ?', [
      characterId,
    ]);
    if (!res.length || !res[0].values.length) {
      return { ...DEFAULT_RELATIONSHIP, characterId };
    }

    const row = res[0].values[0];
    const cols = res[0].columns;
    const obj: any = {};
    cols.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      characterId: obj.character_id,
      affinityPoints: obj.affinity_points ?? 0,
      currentStageId: obj.current_stage_id,
      stages: JSON.parse(obj.stages_json || '[]'),
      milestones: JSON.parse(obj.milestones_json || '[]'),
      updatedAt: obj.updated_at || Date.now(),
    };
  }

  public async saveRelationshipProgress(rel: RelationshipProgress): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO relationship_progress (
        character_id, affinity_points, current_stage_id, stages_json, milestones_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id) DO UPDATE SET
        affinity_points=excluded.affinity_points, current_stage_id=excluded.current_stage_id,
        stages_json=excluded.stages_json, milestones_json=excluded.milestones_json, updated_at=excluded.updated_at
    `;
    this.db!.run(query, [
      rel.characterId,
      rel.affinityPoints,
      rel.currentStageId,
      JSON.stringify(rel.stages || []),
      JSON.stringify(rel.milestones || []),
      Date.now(),
    ]);
    this.persist();
  }

  // ==========================================
  // PROVIDER OPERATIONS
  // ==========================================

  public async getProviders(): Promise<AIProviderConfig[]> {
    await this.init();
    const res = this.db!.exec('SELECT * FROM providers ORDER BY is_active DESC, name ASC');
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        name: obj.name,
        baseUrl: obj.base_url,
        apiKey: obj.api_key || '',
        model: obj.model,
        customHeaders: JSON.parse(obj.custom_headers || '{}'),
        temperature: obj.temperature ?? 0.8,
        topP: obj.top_p ?? 0.95,
        maxTokens: obj.max_tokens ?? 2048,
        contextWindow: obj.context_window ?? 16000,
        enableReasoning: Boolean(obj.enable_reasoning),
        reasoningEffort: obj.reasoning_effort || 'medium',
        timeoutMs: obj.timeout_ms ?? 45000,
        retryCount: obj.retry_count ?? 2,
        fallbackProviderId: obj.fallback_provider_id || undefined,
        isActive: Boolean(obj.is_active),
      };
    });
  }

  public async saveProvider(prov: AIProviderConfig): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO providers (
        id, name, base_url, api_key, model, custom_headers, temperature, top_p,
        max_tokens, context_window, enable_reasoning, reasoning_effort, timeout_ms,
        retry_count, fallback_provider_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, base_url=excluded.base_url, api_key=excluded.api_key,
        model=excluded.model, custom_headers=excluded.custom_headers, temperature=excluded.temperature,
        top_p=excluded.top_p, max_tokens=excluded.max_tokens, context_window=excluded.context_window,
        enable_reasoning=excluded.enable_reasoning, reasoning_effort=excluded.reasoning_effort,
        timeout_ms=excluded.timeout_ms, retry_count=excluded.retry_count,
        fallback_provider_id=excluded.fallback_provider_id, is_active=excluded.is_active
    `;
    this.db!.run(query, [
      prov.id,
      prov.name,
      prov.baseUrl,
      prov.apiKey || '',
      prov.model,
      JSON.stringify(prov.customHeaders || {}),
      prov.temperature ?? 0.8,
      prov.topP ?? 0.95,
      prov.maxTokens ?? 2048,
      prov.contextWindow ?? 16000,
      prov.enableReasoning ? 1 : 0,
      prov.reasoningEffort || 'medium',
      prov.timeoutMs ?? 45000,
      prov.retryCount ?? 2,
      prov.fallbackProviderId || null,
      prov.isActive ? 1 : 0,
    ]);
    this.persist();
  }

  public async setActiveProvider(id: string): Promise<void> {
    await this.init();
    this.db!.run('UPDATE providers SET is_active = 0');
    this.db!.run('UPDATE providers SET is_active = 1 WHERE id = ?', [id]);
    this.persist();
  }

  public async deleteProvider(id: string): Promise<void> {
    await this.init();
    this.db!.run('DELETE FROM providers WHERE id = ?', [id]);
    this.persist();
  }

  // ==========================================
  // PROACTIVE RULES OPERATIONS
  // ==========================================

  public async getProactiveRules(characterId?: string): Promise<ProactiveRule[]> {
    await this.init();
    const query = characterId
      ? 'SELECT * FROM proactive_rules WHERE character_id = ?'
      : 'SELECT * FROM proactive_rules';
    const params = characterId ? [characterId] : [];
    const res = this.db!.exec(query, params);
    if (!res.length) return [];

    const cols = res[0].columns;
    return res[0].values.map((row) => {
      const obj: any = {};
      cols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        characterId: obj.character_id,
        type: obj.type,
        title: obj.title,
        isEnabled: Boolean(obj.is_enabled),
        promptGuidance: obj.prompt_guidance,
        inactivityHours: obj.inactivity_hours ?? undefined,
        morningStart: obj.morning_start ?? undefined,
        morningEnd: obj.morning_end ?? undefined,
        eveningStart: obj.evening_start ?? undefined,
        eveningEnd: obj.evening_end ?? undefined,
        quietHoursStart: obj.quiet_hours_start ?? '23:00',
        quietHoursEnd: obj.quiet_hours_end ?? '08:00',
        cooldownHours: obj.cooldown_hours ?? 6,
        lastTriggeredAt: obj.last_triggered_at ?? undefined,
      };
    });
  }

  public async saveProactiveRule(rule: ProactiveRule): Promise<void> {
    await this.init();
    const query = `
      INSERT INTO proactive_rules (
        id, character_id, type, title, is_enabled, prompt_guidance,
        inactivity_hours, morning_start, morning_end, evening_start, evening_end,
        quiet_hours_start, quiet_hours_end, cooldown_hours, last_triggered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type=excluded.type, title=excluded.title, is_enabled=excluded.is_enabled,
        prompt_guidance=excluded.prompt_guidance, inactivity_hours=excluded.inactivity_hours,
        morning_start=excluded.morning_start, morning_end=excluded.morning_end,
        evening_start=excluded.evening_start, evening_end=excluded.evening_end,
        quiet_hours_start=excluded.quiet_hours_start, quiet_hours_end=excluded.quiet_hours_end,
        cooldown_hours=excluded.cooldown_hours, last_triggered_at=excluded.last_triggered_at
    `;
    this.db!.run(query, [
      rule.id,
      rule.characterId,
      rule.type,
      rule.title,
      rule.isEnabled ? 1 : 0,
      rule.promptGuidance,
      rule.inactivityHours ?? null,
      rule.morningStart ?? null,
      rule.morningEnd ?? null,
      rule.eveningStart ?? null,
      rule.eveningEnd ?? null,
      rule.quietHoursStart ?? '23:00',
      rule.quietHoursEnd ?? '08:00',
      rule.cooldownHours ?? 6,
      rule.lastTriggeredAt ?? null,
    ]);
    this.persist();
  }

  // ==========================================
  // APP SETTINGS OPERATIONS
  // ==========================================

  public async getSettings(): Promise<AppSettings> {
    await this.init();
    const res = this.db!.exec("SELECT value FROM app_settings WHERE key = 'global_settings'");
    if (!res.length || !res[0].values.length) {
      return DEFAULT_APP_SETTINGS;
    }
    try {
      const raw = res[0].values[0][0] as string;
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.init();
    this.db!.run(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('global_settings', ?)",
      [JSON.stringify(settings)]
    );
    this.persist();
  }

  // ==========================================
  // FULL BACKUP IMPORT & EXPORT
  // ==========================================

  public async exportFullBackup(): Promise<string> {
    await this.init();
    const characters = await this.getCharacters();
    const conversations = await this.getConversations();
    const allMessages: ChatMessage[] = [];
    for (const c of conversations) {
      const msgs = await this.getMessages(c.id);
      allMessages.push(...msgs);
    }
    const memories = await this.getMemories();
    const blacklist = await this.getBlacklistRules();
    const providers = await this.getProviders();
    const proactiveRules = await this.getProactiveRules();
    const settings = await this.getSettings();

    const activeChar = await this.getActiveCharacter();
    const emotionalState = await this.getEmotionalState(activeChar.id);
    const relationship = await this.getRelationshipProgress(activeChar.id);

    const backup = {
      version: '1.0.0',
      timestamp: Date.now(),
      characters,
      conversations,
      messages: allMessages,
      memories,
      blacklist,
      providers,
      proactiveRules,
      settings,
      emotionalState,
      relationship,
    };

    return JSON.stringify(backup, null, 2);
  }

  public async importFullBackup(jsonContent: string): Promise<boolean> {
    await this.init();
    try {
      const data = JSON.parse(jsonContent);
      if (!data || typeof data !== 'object') return false;

      if (Array.isArray(data.characters)) {
        for (const char of data.characters) await this.saveCharacter(char);
      }
      if (Array.isArray(data.conversations)) {
        for (const conv of data.conversations) await this.saveConversation(conv);
      }
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) await this.saveMessage(msg);
      }
      if (Array.isArray(data.memories)) {
        for (const mem of data.memories) await this.saveMemory(mem);
      }
      if (Array.isArray(data.blacklist)) {
        for (const rule of data.blacklist) await this.saveBlacklistRule(rule);
      }
      if (Array.isArray(data.providers)) {
        for (const prov of data.providers) await this.saveProvider(prov);
      }
      if (Array.isArray(data.proactiveRules)) {
        for (const rule of data.proactiveRules) await this.saveProactiveRule(rule);
      }
      if (data.settings) {
        await this.saveSettings(data.settings);
      }
      if (data.emotionalState) {
        await this.saveEmotionalState(data.emotionalState);
      }
      if (data.relationship) {
        await this.saveRelationshipProgress(data.relationship);
      }

      this.persist();
      return true;
    } catch (err) {
      console.error('Failed to import backup:', err);
      return false;
    }
  }
}
