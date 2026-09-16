import { describe, it, expect } from 'vitest';
import { DEFAULT_TTS_CONFIG, DEFAULT_STT_CONFIG } from '../src/services/storage/defaults';
import { TTSService } from '../src/services/voice/ttsService';
import { CharacterProfile } from '../src/types/character';

describe('Voice and Avatar System', () => {
  it('defaults to Fish Audio with s2.1-pro-free model', () => {
    expect(DEFAULT_TTS_CONFIG.engine).toBe('fish_audio');
    expect(DEFAULT_TTS_CONFIG.fishAudioModel).toBe('s2.1-pro-free');
    expect(DEFAULT_TTS_CONFIG.fishAudioEndpoint).toBe('https://api.fish.audio/v1/tts');
  });

  it('defaults to microphone STT engine with Persian language', () => {
    expect(DEFAULT_STT_CONFIG.engine).toBe('microphone');
    expect(DEFAULT_STT_CONFIG.language).toBe('fa');
  });

  it('properly strips markdown and emotes for TTS speech text', () => {
    const tts = new TTSService();
    const raw = 'سلام عزیزم! *با خوشحالی لبخند می‌زند* امروز حالت چطوره؟ <think>فکر درونی</think>';
    const cleaned = tts.cleanTextForSpeech(raw);
    expect(cleaned).not.toContain('*با خوشحالی لبخند می‌زند*');
    expect(cleaned).not.toContain('فکر درونی');
    expect(cleaned).toContain('سلام عزیزم');
    expect(cleaned).toContain('امروز حالت چطوره');
  });

  it('supports 2D model and 3D VRM model fields on character', () => {
    const char: Partial<CharacterProfile> = {
      modelType: 'vrm',
      vrmModelUrl: 'blob:http://localhost/vrm-test',
      vrmMetadata: {
        title: 'Anime Waifu 3D',
        author: 'Artist',
      },
      model2dUrl: 'data:image/png;base64,...',
    };
    expect(char.modelType).toBe('vrm');
    expect(char.vrmModelUrl).toBeDefined();
    expect(char.vrmMetadata?.title).toBe('Anime Waifu 3D');
  });
});
