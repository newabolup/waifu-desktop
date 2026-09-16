import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Play, RefreshCw, Mic, MicOff } from 'lucide-react';
import { sttService } from '../../services/voice/sttService';
import { STTConfig } from '../../types/voice';
import { DEFAULT_STT_CONFIG } from '../../services/storage/defaults';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onStopGeneration: () => void;
  onContinueGeneration?: () => void;
  onRetryLast?: () => void;
  isGenerating: boolean;
  canContinue?: boolean;
  characterName: string;
  sttConfig?: STTConfig;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  onContinueGeneration,
  onRetryLast,
  isGenerating,
  canContinue = false,
  characterName,
  sttConfig = DEFAULT_STT_CONFIG,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (isListening) {
      sttService.stopListening();
      setIsListening(false);
    }
    if (isGenerating) {
      onStopGeneration();
      return;
    }
    if (!input.trim()) return;

    onSendMessage(input.trim());
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      sttService.stopListening();
      setIsListening(false);
      setInterimText('');
      return;
    }

    try {
      await sttService.startListening(sttConfig, {
        onStart: () => {
          setIsListening(true);
        },
        onInterimResult: (text) => {
          setInterimText(text);
        },
        onFinalResult: (text) => {
          setInput((prev) => (prev ? `${prev} ${text}` : text));
          setInterimText('');
        },
        onError: (err) => {
          console.warn('STT Error:', err);
          setIsListening(false);
          setInterimText('');
        },
        onEnd: () => {
          setIsListening(false);
          setInterimText('');
        },
      });
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const estTokens = Math.ceil(input.length / 3.8);

  return (
    <div className="w-full px-4 pb-3 select-none">
      {/* Action shortcuts bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {canContinue && onContinueGeneration && (
            <button
              onClick={onContinueGeneration}
              disabled={isGenerating}
              className="flex items-center gap-1 text-xs text-sakura-400 hover:text-sakura-300 transition"
            >
              <Play className="w-3 h-3" />
              Continue generation
            </button>
          )}
          {onRetryLast && (
            <button
              onClick={onRetryLast}
              disabled={isGenerating}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Retry last
            </button>
          )}
          {isListening && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Listening to your voice... {interimText && <span className="italic text-slate-300">&ldquo;{interimText}&rdquo;</span>}
            </span>
          )}
        </div>

        {input.length > 0 && (
          <span className="text-[10px] text-slate-500 font-mono">
            ~{estTokens} tokens ({input.length} chars)
          </span>
        )}
      </div>

      {/* Input container */}
      <div className={`relative flex items-end gap-2 p-2 rounded-2xl bg-[#141726]/90 border shadow-xl transition-all ${
        isListening
          ? 'border-rose-500/70 shadow-rose-500/10'
          : 'border-slate-800 focus-within:border-sakura-500/50'
      }`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          dir="auto"
          placeholder={isListening ? 'Speak now into microphone...' : `Message ${characterName}... (Press Enter to send)`}
          rows={1}
          className="flex-1 max-h-40 p-2 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed select-text"
        />

        <div className="flex items-center gap-1.5 mb-1">
          {/* STT Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={isListening ? 'Stop recording voice' : 'Speak to companion (Voice Input)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {isGenerating ? (
            <button
              onClick={onStopGeneration}
              className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition flex items-center justify-center"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-2.5 rounded-xl transition flex items-center justify-center ${
                input.trim()
                  ? 'bg-gradient-to-r from-sakura-600 to-rose-600 hover:from-sakura-500 hover:to-rose-500 text-white shadow-md shadow-sakura-600/30'
                  : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
