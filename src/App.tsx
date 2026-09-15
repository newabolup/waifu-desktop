import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from './services/storage/db';
import { CharacterProfile } from './types/character';
import { ConversationSession, ChatMessage } from './types/conversation';
import { MemoryItem } from './types/memory';
import { EmotionalState } from './types/emotion';
import { RelationshipProgress } from './types/relationship';
import { AIProviderConfig } from './types/provider';
import { ProactiveRule } from './types/proactive';
import { AppSettings } from './types/settings';
import { TTSConfig } from './types/voice';
import { DEFAULT_TTS_CONFIG } from './services/storage/defaults';

import { promptEngine } from './services/prompt/promptEngine';
import { providerEngine } from './services/ai/providerEngine';
import { memoryEngine } from './services/memory/memoryEngine';
import { emotionEngine } from './services/emotion/emotionEngine';
import { relationshipEngine } from './services/relationship/relationshipEngine';
import { proactiveScheduler } from './services/proactive/proactiveScheduler';
import { ttsService } from './services/voice/ttsService';

import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { SakuraPetals } from './components/layout/SakuraPetals';
import { AvatarDisplay } from './components/avatar/AvatarDisplay';
import { ChatView } from './components/chat/ChatView';
import { CharacterStudio } from './components/character/CharacterStudio';
import { PromptStudio } from './components/prompt/PromptStudio';
import { MemoryManager } from './components/memory/MemoryManager';
import { ProviderSettings } from './components/providers/ProviderSettings';
import { RelationshipView } from './components/relationship/RelationshipView';
import { EmotionView } from './components/emotion/EmotionView';
import { ProactiveSettings } from './components/proactive/ProactiveSettings';
import { VoiceSettings } from './components/voice/VoiceSettings';
import { DebugPanel } from './components/debug/DebugPanel';
import { SettingsView } from './components/settings/SettingsView';

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  // Core Data States
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<CharacterProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null);
  const [relationship, setRelationship] = useState<RelationshipProgress | null>(null);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>('');
  const [proactiveRules, setProactiveRules] = useState<ProactiveRule[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>(DEFAULT_TTS_CONFIG);

  // Live Chat Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThoughts, setStreamingThoughts] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | undefined>();

  // Diagnostics & Telemetry
  const [lastLatencyMs, setLastLatencyMs] = useState(0);
  const [lastTokensUsed, setLastTokensUsed] = useState(0);
  const [lastRetrievedMemories, setLastRetrievedMemories] = useState<MemoryItem[]>([]);
  const [lastAssembledPrompt, setLastAssembledPrompt] = useState('');
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const storage = StorageService.getInstance();

  // 1. Initial Load from SQLite
  const loadAllData = async () => {
    try {
      await storage.init();

      const loadedChars = await storage.getCharacters();
      setCharacters(loadedChars);
      const activeChar = loadedChars.find((c) => c.isActive) || loadedChars[0];
      setActiveCharacter(activeChar);

      const loadedConvs = await storage.getConversations(activeChar?.id);
      setConversations(loadedConvs);

      let activeConv = loadedConvs[0];
      if (!activeConv && activeChar) {
        activeConv = {
          id: 'conv-' + Math.random().toString(36).substring(2, 9),
          characterId: activeChar.id,
          title: 'First Encounter',
          isPinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await storage.saveConversation(activeConv);
        setConversations([activeConv]);
      }
      setActiveConversation(activeConv || null);

      if (activeConv) {
        const msgs = await storage.getMessages(activeConv.id);
        setMessages(msgs);
      }

      if (activeChar) {
        const emo = await emotionEngine.getAndDecayState(activeChar);
        setEmotionalState(emo);

        const rel = await storage.getRelationshipProgress(activeChar.id);
        setRelationship(rel);

        const mems = await storage.getMemories(activeChar.id);
        setMemories(mems);

        const rules = await storage.getProactiveRules(activeChar.id);
        setProactiveRules(rules);
      }

      const provs = await storage.getProviders();
      setProviders(provs);
      const actProv = provs.find((p) => p.isActive) || provs[0];
      if (actProv) setActiveProviderId(actProv.id);

      const appSettings = await storage.getSettings();
      setSettings(appSettings);

      setIsLoaded(true);
    } catch (err: any) {
      console.error('Fatal initialization error:', err);
      setErrorLog((prev) => [...prev, `Initialization error: ${err.message}`]);
    }
  };

  useEffect(() => {
    loadAllData();

    // Start proactive messaging scheduler
    proactiveScheduler.start(60);
    proactiveScheduler.registerMessageCallback((msgText, charName) => {
      // Refresh messages if currently on chat
      if (activeConversation) {
        storage.getMessages(activeConversation.id).then((freshMsgs) => {
          setMessages(freshMsgs);
        });
      }
    });

    return () => {
      proactiveScheduler.stop();
      ttsService.stop();
    };
  }, []);

  // Update theme class on root element
  useEffect(() => {
    if (settings?.theme) {
      document.body.className = `theme-${settings.theme} bg-[var(--bg-main)] text-slate-100 select-none overflow-hidden font-['Outfit',sans-serif]`;
    }
  }, [settings?.theme]);

  // 2. Chat Send Handler
  const handleSendMessage = async (userText: string) => {
    if (!activeCharacter || !activeConversation || !settings) return;

    proactiveScheduler.recordUserActivity();
    setErrorMessage('');

    // Save user message to SQLite
    const userMsgId = 'msg-' + Math.random().toString(36).substring(2, 9);
    const userMsg: ChatMessage = {
      id: userMsgId,
      conversationId: activeConversation.id,
      role: 'user',
      content: userText,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    await storage.saveMessage(userMsg);

    // Auto-rename conversation if first turn
    if (messages.length === 0) {
      const title = userText.slice(0, 32) + (userText.length > 32 ? '...' : '');
      const updatedConv = { ...activeConversation, title };
      setActiveConversation(updatedConv);
      await storage.saveConversation(updatedConv);
      const allConvs = await storage.getConversations(activeCharacter.id);
      setConversations(allConvs);
    }

    // Retrieve relevant memories based on user message
    const retrieved = await memoryEngine.retrieveRelevantMemories(
      activeCharacter.id,
      userText,
      messages.slice(-3).map((m) => m.content).join(' '),
      settings.memoryTokenBudget || 800
    );
    setLastRetrievedMemories(retrieved);

    // Compile payload
    const payload = promptEngine.compilePayload({
      character: activeCharacter,
      emotionalState: emotionalState || undefined,
      relationship: relationship || undefined,
      memories: retrieved,
      userProfile: settings.userProfile,
      recentMessages: newHistory,
      maxRecentMessages: 20,
    });

    const compiledPrompt = promptEngine.compileSystemPrompt({
      character: activeCharacter,
      emotionalState: emotionalState || undefined,
      relationship: relationship || undefined,
      memories: retrieved,
      userProfile: settings.userProfile,
    });
    setLastAssembledPrompt(compiledPrompt);

    // Select provider
    const currentProvider = providers.find((p) => p.id === activeProviderId) || providers[0];
    const fallbackProvider = providers.find((p) => p.id === currentProvider?.fallbackProviderId);

    if (!currentProvider) {
      setErrorMessage('No AI Provider configured. Please configure an endpoint in the Providers tab.');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setStreamingThoughts('');

    const startTime = Date.now();

    try {
      await providerEngine.streamChat(
        currentProvider,
        payload,
        {
          onChunk: (delta) => {
            setStreamingContent((prev) => prev + delta);
          },
          onThought: (thoughtDelta) => {
            setStreamingThoughts((prev) => prev + thoughtDelta);
          },
          onError: (err) => {
            const errStr = `Error with ${currentProvider.name}: ${err.message}`;
            setErrorMessage(errStr);
            setErrorLog((prev) => [...prev, errStr]);
            setIsGenerating(false);
          },
          onComplete: async (fullContent, fullThoughts) => {
            setIsGenerating(false);
            const latency = Date.now() - startTime;
            setLastLatencyMs(latency);

            if (!fullContent && !fullThoughts) return;

            // Save assistant message to SQLite
            const assistantMsgId = 'msg-' + Math.random().toString(36).substring(2, 9);
            const assistantMsg: ChatMessage = {
              id: assistantMsgId,
              conversationId: activeConversation.id,
              role: 'assistant',
              content: fullContent,
              thoughts: fullThoughts,
              latencyMs: latency,
              modelUsed: currentProvider.model,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            await storage.saveMessage(assistantMsg);
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent('');
            setStreamingThoughts('');

            // 1. Update Emotional State
            if (emotionalState) {
              const updatedEmo = emotionEngine.updateEmotionalReaction(
                emotionalState,
                userText,
                fullContent
              );
              setEmotionalState(updatedEmo);
              await storage.saveEmotionalState(updatedEmo);
            }

            // 2. Add Affinity Points & Update Relationship
            if (relationship) {
              const affinityGain = relationshipEngine.calculateAffinityGain(userText, fullContent);
              const { progress } = await relationshipEngine.addAffinity(
                activeCharacter.id,
                affinityGain
              );
              setRelationship(progress);
            }

            // 3. Auto-extract durable memories in the background
            if (settings.autoExtractMemories) {
              memoryEngine
                .extractAndStoreMemories(
                  activeCharacter.id,
                  userText,
                  fullContent,
                  currentProvider,
                  assistantMsgId
                )
                .then((savedMems) => {
                  if (savedMems.length > 0) {
                    storage.getMemories(activeCharacter.id).then((fresh) => setMemories(fresh));
                  }
                })
                .catch((e) => console.warn('Memory extraction error:', e));
            }

            // 4. Auto-Speak with TTS if enabled
            if (ttsConfig.autoSpeak) {
              handleSpeakMessage(assistantMsgId, fullContent);
            }
          },
        },
        fallbackProvider
      );
    } catch (err: any) {
      setErrorMessage(`Request error: ${err.message}`);
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    providerEngine.stopGeneration();
    setIsGenerating(false);
  };

  const handleRegenerateMessage = async (msgId: string) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;

    // Find the preceding user message
    const precedingUserMsg = messages
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === 'user');

    if (precedingUserMsg) {
      // Delete old assistant response
      await storage.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      handleSendMessage(precedingUserMsg.content);
    }
  };

  const handleEditMessage = async (msgId: string, newContent: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (!target) return;

    const updated = { ...target, content: newContent, updatedAt: Date.now() };
    await storage.saveMessage(updated);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
  };

  const handleDeleteMessage = async (msgId: string) => {
    await storage.deleteMessage(msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const handleSpeakMessage = (msgId: string, text: string) => {
    setActiveAudioMessageId(msgId);
    ttsService.speak(
      text,
      ttsConfig,
      () => setActiveAudioMessageId(msgId),
      () => setActiveAudioMessageId(undefined)
    );
  };

  const handleStopAudio = () => {
    ttsService.stop();
    setActiveAudioMessageId(undefined);
  };

  // Conversation Session Handlers
  const handleSelectConversation = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setActiveConversation(conv);
      const msgs = await storage.getMessages(conv.id);
      setMessages(msgs);
    }
  };

  const handleCreateConversation = async () => {
    if (!activeCharacter) return;
    const newConv: ConversationSession = {
      id: 'conv-' + Math.random().toString(36).substring(2, 9),
      characterId: activeCharacter.id,
      title: 'New Conversation',
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversation(newConv);
    setMessages([]);
  };

  const handleRenameConversation = async (id: string, title: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      const updated = { ...conv, title, updatedAt: Date.now() };
      await storage.saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (activeConversation?.id === id) setActiveConversation(updated);
    }
  };

  const handleTogglePinConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      const updated = { ...conv, isPinned: !conv.isPinned };
      await storage.saveConversation(updated);
      const reloaded = await storage.getConversations(activeCharacter?.id);
      setConversations(reloaded);
      if (activeConversation?.id === id) setActiveConversation(updated);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await storage.deleteConversation(id);
    const reloaded = await storage.getConversations(activeCharacter?.id);
    setConversations(reloaded);
    if (activeConversation?.id === id) {
      const nextConv = reloaded[0];
      setActiveConversation(nextConv || null);
      if (nextConv) {
        const msgs = await storage.getMessages(nextConv.id);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    }
  };

  const handleExportConversation = (id: string, format: 'json' | 'markdown') => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    if (format === 'markdown') {
      let md = `# Conversation: ${conv.title}\nDate: ${new Date(conv.createdAt).toLocaleString()}\nPartner: ${activeCharacter?.name}\n\n---\n\n`;
      for (const m of messages) {
        const sender = m.role === 'user' ? 'You' : activeCharacter?.name || 'Assistant';
        md += `### **${sender}** (${new Date(m.createdAt).toLocaleTimeString()}):\n${m.content}\n\n`;
      }
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conv.title.replace(/\s+/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClearCurrentChat = async () => {
    if (!activeConversation) return;
    for (const m of messages) {
      await storage.deleteMessage(m.id);
    }
    setMessages([]);
  };

  if (!isLoaded || !activeCharacter || !activeConversation || !emotionalState || !relationship || !settings) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0b12] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-sakura-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-200">Initializing Kizuna Desktop AI...</h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">Loading local SQLite persistence & neural adapters</p>
      </div>
    );
  }

  const dominantMood = emotionEngine.getDominantMood(emotionalState);
  const currentStage = relationshipEngine.getCurrentStage(relationship);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-main)] text-slate-100 relative">
      {/* Titlebar with window controls */}
      <TitleBar characterName={activeCharacter.name} stageName={currentStage.name} />

      {/* Ambient Sakura Petals */}
      {settings.petalParticles && <SakuraPetals />}

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          memoryCount={memories.length}
        />

        {/* Center Canvas / View Content */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'chat' && (
            <div className="flex-1 flex h-full overflow-hidden">
              {/* Main Chat Stream Area */}
              <div className="flex-1 h-full flex flex-col overflow-hidden border-r border-slate-800/80">
                <ChatView
                  character={activeCharacter}
                  activeConversation={activeConversation}
                  allConversations={conversations}
                  messages={messages}
                  streamingContent={streamingContent}
                  streamingThoughts={streamingThoughts}
                  isGenerating={isGenerating}
                  activeAudioMessageId={activeAudioMessageId}
                  errorMessage={errorMessage}
                  onSendMessage={handleSendMessage}
                  onStopGeneration={handleStopGeneration}
                  onContinueGeneration={() => handleSendMessage('Please continue.')}
                  onRetryLast={() => {
                    const lastUser = messages.slice().reverse().find((m) => m.role === 'user');
                    if (lastUser) handleSendMessage(lastUser.content);
                  }}
                  onRegenerateMessage={handleRegenerateMessage}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onSelectConversation={handleSelectConversation}
                  onCreateConversation={handleCreateConversation}
                  onRenameConversation={handleRenameConversation}
                  onTogglePinConversation={handleTogglePinConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onExportConversation={handleExportConversation}
                  onClearCurrentChat={handleClearCurrentChat}
                  onSpeakMessage={handleSpeakMessage}
                  onStopAudio={handleStopAudio}
                />
              </div>

              {/* Right Anime Waifu Interactive Live Avatar HUD */}
              <div className="hidden lg:flex w-96 h-full bg-[#090b14]/90 backdrop-blur-xl border-l border-slate-800/80 flex-col items-center justify-between z-10 shadow-2xl">
                <AvatarDisplay
                  character={activeCharacter}
                  emotionalState={emotionalState}
                  relationship={relationship}
                  dominantMood={dominantMood}
                  isTalking={isGenerating}
                  isAudioPlaying={Boolean(activeAudioMessageId)}
                  onUpdateCharacterAssets={async (assets) => {
                    const updated = { ...activeCharacter, avatarAssets: assets };
                    setActiveCharacter(updated);
                    await storage.saveCharacter(updated);
                  }}
                  onStopAudio={handleStopAudio}
                />
              </div>
            </div>
          )}

          {activeTab === 'characters' && (
            <CharacterStudio
              characters={characters}
              activeCharacter={activeCharacter}
              onSaveCharacter={async (char) => {
                await storage.saveCharacter(char);
                const reloaded = await storage.getCharacters();
                setCharacters(reloaded);
                if (char.id === activeCharacter.id) setActiveCharacter(char);
              }}
              onDeleteCharacter={async (id) => {
                await storage.deleteCharacter(id);
                loadAllData();
              }}
              onSelectActiveCharacter={async (id) => {
                const updated = characters.map((c) => ({ ...c, isActive: c.id === id }));
                for (const c of updated) await storage.saveCharacter(c);
                loadAllData();
              }}
            />
          )}

          {activeTab === 'prompts' && (
            <PromptStudio
              character={activeCharacter}
              emotionalState={emotionalState}
              relationship={relationship}
              userProfile={settings.userProfile}
              onSaveCharacter={async (updated) => {
                await storage.saveCharacter(updated);
                setActiveCharacter(updated);
              }}
            />
          )}

          {activeTab === 'memory' && <MemoryManager characterId={activeCharacter.id} />}

          {activeTab === 'providers' && (
            <ProviderSettings
              providers={providers}
              activeProviderId={activeProviderId}
              onSaveProvider={async (prov) => {
                await storage.saveProvider(prov);
                const reloaded = await storage.getProviders();
                setProviders(reloaded);
              }}
              onDeleteProvider={async (id) => {
                await storage.deleteProvider(id);
                const reloaded = await storage.getProviders();
                setProviders(reloaded);
              }}
              onSetActiveProvider={async (id) => {
                await storage.setActiveProvider(id);
                setActiveProviderId(id);
                const reloaded = await storage.getProviders();
                setProviders(reloaded);
              }}
            />
          )}

          {activeTab === 'relationship' && (
            <RelationshipView
              relationship={relationship}
              characterName={activeCharacter.name}
              onSaveRelationship={async (rel) => {
                await storage.saveRelationshipProgress(rel);
                setRelationship(rel);
              }}
            />
          )}

          {activeTab === 'emotions' && (
            <EmotionView
              emotionalState={emotionalState}
              character={activeCharacter}
              dominantMood={dominantMood}
              onSaveEmotionalState={async (emo) => {
                await storage.saveEmotionalState(emo);
                setEmotionalState(emo);
              }}
            />
          )}

          {activeTab === 'scheduled' && (
            <ProactiveSettings
              rules={proactiveRules}
              character={activeCharacter}
              onSaveRule={async (rule) => {
                await storage.saveProactiveRule(rule);
                const fresh = await storage.getProactiveRules(activeCharacter.id);
                setProactiveRules(fresh);
              }}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceSettings
              ttsConfig={ttsConfig}
              characterName={activeCharacter.name}
              onSaveTTSConfig={(cfg) => setTtsConfig(cfg)}
            />
          )}

          {activeTab === 'debug' && (
            <DebugPanel
              activeProvider={
                providers.find((p) => p.id === activeProviderId) || providers[0]
              }
              lastLatencyMs={lastLatencyMs}
              lastTokensUsed={lastTokensUsed}
              lastRetrievedMemories={lastRetrievedMemories}
              lastAssembledPrompt={lastAssembledPrompt}
              maskSensitiveKeys={settings.maskSensitiveKeys}
              onToggleMaskKeys={async (mask) => {
                const updated = { ...settings, maskSensitiveKeys: mask };
                setSettings(updated);
                await storage.saveSettings(updated);
              }}
              errorLog={errorLog}
              onClearErrors={() => setErrorLog([])}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={async (updated) => {
                await storage.saveSettings(updated);
                setSettings(updated);
              }}
              onRefreshAllData={loadAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
};
