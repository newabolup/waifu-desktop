import React, { useState, useEffect, useRef } from 'react';
import { CharacterProfile, AvatarExpression } from '../../types/character';
import { EmotionalState, DominantMood } from '../../types/emotion';
import { RelationshipProgress } from '../../types/relationship';
import { TTSConfig, STTConfig } from '../../types/voice';
import { VrmAvatarViewer } from '../avatar/VrmAvatarViewer';
import { AnimeCharacterSvg } from '../avatar/AnimeCharacterSvg';
import { EmotionalAura } from '../avatar/EmotionalAura';
import { sttService } from '../../services/voice/sttService';
import { ttsService } from '../../services/voice/ttsService';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Loader2,
  Camera,
  Maximize2,
  Minimize2,
  Radio,
} from 'lucide-react';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterProfile;
  emotionalState: EmotionalState;
  relationship: RelationshipProgress;
  dominantMood: DominantMood;
  ttsConfig: TTSConfig;
  sttConfig: STTConfig;
  onSendVoiceMessage: (userText: string) => Promise<string>; // Returns assistant response text
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  character,
  emotionalState,
  relationship,
  dominantMood,
  ttsConfig,
  sttConfig,
  onSendVoiceMessage,
}) => {
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [callState, setCallState] = useState<'listening' | 'processing' | 'speaking' | 'idle'>('idle');
  const [lastSpokenTranscript, setLastSpokenTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);

  // Active expression during call
  const activeExpression: AvatarExpression =
    callState === 'speaking'
      ? 'talking'
      : emotionalState.happiness >= 75
      ? 'happy'
      : emotionalState.anger >= 50
      ? 'angry'
      : emotionalState.sadness >= 50
      ? 'sad'
      : 'idle';

  // Call duration timer
  useEffect(() => {
    if (!isOpen) {
      setCallSeconds(0);
      setCallState('idle');
      sttService.stopListening();
      ttsService.stop();
      return;
    }

    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      sttService.stopListening();
      ttsService.stop();
    };
  }, [isOpen]);

  // Visualizer loop for live audio volume
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const checkVolume = () => {
      if (callState === 'speaking') {
        setAudioVolume(ttsService.getAudioVolume());
      } else {
        setAudioVolume(0);
      }
      animId = requestAnimationFrame(checkVolume);
    };
    animId = requestAnimationFrame(checkVolume);

    return () => cancelAnimationFrame(animId);
  }, [isOpen, callState]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start / Toggle Speaking to Character
  const handleToggleMic = async () => {
    if (callState === 'speaking') {
      ttsService.stop();
      setCallState('idle');
      return;
    }

    if (isMicActive) {
      setIsMicActive(false);
      setCallState('processing');
      sttService.stopListening();
      return;
    }

    try {
      setIsMicActive(true);
      setCallState('listening');
      setLastSpokenTranscript('در حال شنیدن صدای شما...');

      await sttService.startListening(sttConfig, {
        onStart: () => {
          setIsMicActive(true);
          setCallState('listening');
        },
        onInterimResult: (text) => {
          setLastSpokenTranscript(text);
        },
        onFinalResult: async (userText) => {
          setIsMicActive(false);
          if (!userText.trim()) {
            setCallState('idle');
            setLastSpokenTranscript('');
            return;
          }

          setLastSpokenTranscript(`شما: "${userText}"`);
          setCallState('processing');

          try {
            // Send to LLM
            const aiResponse = await onSendVoiceMessage(userText);
            if (!aiResponse) {
              setCallState('idle');
              return;
            }

            // Speak AI response with TTS & lip-sync
            setCallState('speaking');
            await ttsService.speak(
              aiResponse,
              ttsConfig,
              () => setCallState('speaking'),
              () => {
                setCallState('idle');
                setAudioVolume(0);
              }
            );
          } catch (err) {
            console.error('Talk-to-talk error:', err);
            setCallState('idle');
          }
        },
        onError: (err) => {
          console.warn('Call STT error:', err);
          setIsMicActive(false);
          setCallState('idle');
          setLastSpokenTranscript('خطا در میکروفن');
          setTimeout(() => setLastSpokenTranscript(''), 3000);
        },
        onEnd: () => {
          setIsMicActive(false);
          if (callState === 'listening') {
            setCallState('idle');
          }
        },
      });
    } catch (e) {
      console.error(e);
      setIsMicActive(false);
      setCallState('idle');
    }
  };

  const handleEndCall = () => {
    sttService.stopListening();
    ttsService.stop();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070913] text-white select-none overflow-hidden animate-fadeIn">
      {/* Emotional Aura Background */}
      <EmotionalAura mood={dominantMood} state={emotionalState} />

      {/* Top Header Bar */}
      <div className="relative z-20 w-full px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Call Status & Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-rose-300">
              LIVE CALL
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-200">{formatTimer(callSeconds)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>HD 1080p • 60 FPS</span>
          </div>
        </div>

        {/* Center: Character Info */}
        <div className="text-center">
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center justify-center gap-1.5 font-vazir">
            <Sparkles className="w-3.5 h-3.5 text-sakura-400" />
            {character.name}
          </h2>
          <span className="text-[10px] text-sakura-300 font-mono">
            {relationship.stages.find((s) => s.id === relationship.currentStageId)?.name || 'Companion'}
          </span>
        </div>

        {/* Right: Sound Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
              } else {
                ttsService.stop();
                setIsMuted(true);
              }
            }}
            className="p-2.5 rounded-full bg-slate-900/70 border border-slate-700/60 hover:text-white text-slate-300 transition backdrop-blur-md"
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Center Stage: 3D VRM Full View */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {character.modelType === 'vrm' && character.vrmModelUrl ? (
          <VrmAvatarViewer
            vrmUrl={character.vrmModelUrl}
            expression={activeExpression}
            isTalking={callState === 'speaking' && !isMuted}
            className="w-full h-full"
          />
        ) : character.model2dUrl ? (
          <div className="relative w-80 h-96 flex items-center justify-center">
            <img
              src={character.model2dUrl}
              alt={character.name}
              className={`w-full h-full object-contain filter drop-shadow-2xl transition-transform ${
                callState === 'speaking' ? 'scale-105 animate-pulse' : ''
              }`}
            />
          </div>
        ) : (
          <AnimeCharacterSvg
            expression={activeExpression}
            isTalking={callState === 'speaking' && !isMuted}
            className="w-full h-full max-w-[420px]"
          />
        )}

        {/* Call Status Indicator Pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          {callState === 'listening' ? (
            <div className="px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 backdrop-blur-md shadow-xl flex items-center gap-2 animate-bounce font-vazir">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>در حال شنیدن صدای شما... صحبت کنید</span>
            </div>
          ) : callState === 'processing' ? (
            <div className="px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-xs text-purple-200 backdrop-blur-md shadow-xl flex items-center gap-2 font-vazir">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>{character.name} در حال فکر کردن است...</span>
            </div>
          ) : callState === 'speaking' ? (
            <div className="px-4 py-1.5 rounded-full bg-sakura-950/80 border border-sakura-500/50 text-xs text-sakura-200 backdrop-blur-md shadow-xl flex items-center gap-2 font-vazir">
              <Sparkles className="w-3.5 h-3.5 text-sakura-400 animate-spin" />
              <span>{character.name} در حال صحبت است</span>
            </div>
          ) : null}
        </div>

        {/* Real-time Subtitle / Voice Feedback Overlay */}
        {lastSpokenTranscript && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-xl w-[90%] z-20 pointer-events-none">
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md text-center text-xs text-slate-200 shadow-2xl font-vazir leading-relaxed">
              {lastSpokenTranscript}
            </div>
          </div>
        )}

        {/* Live Audio Volume Visualizer Wave */}
        {callState === 'speaking' && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20 pointer-events-none">
            {[0.4, 0.8, 1.2, 0.7, 1.4, 0.9, 0.5].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-sakura-500 to-rose-400 transition-all duration-75"
                style={{
                  height: `${Math.max(4, audioVolume * 45 * h)}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Video Call Controls Dock */}
      <div className="relative z-20 w-full px-6 py-6 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-6 p-3 px-6 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          {/* Main Speak / Mic Button */}
          <button
            onClick={handleToggleMic}
            className={`p-4 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${
              isMicActive
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 animate-pulse scale-110'
                : callState === 'speaking'
                ? 'bg-sakura-600 text-white hover:bg-sakura-500 ring-2 ring-sakura-400'
                : 'bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 hover:scale-105'
            }`}
            title={
              isMicActive
                ? 'توقف صحبت و ارسال'
                : callState === 'speaking'
                ? 'قطع صدای کاراکتر'
                : 'شروع صحبت (کلیک برای صحبت)'
            }
          >
            {isMicActive ? (
              <MicOff className="w-6 h-6" />
            ) : callState === 'speaking' ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition hover:scale-105 shadow-lg shadow-rose-600/40 flex items-center justify-center"
            title="پایان تماس صوتی-تصویری"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
