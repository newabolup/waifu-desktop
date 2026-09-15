import React from 'react';
import { EmotionalState, DominantMood } from '../../types/emotion';

interface EmotionalAuraProps {
  mood: DominantMood;
  state: EmotionalState;
}

export const EmotionalAura: React.FC<EmotionalAuraProps> = ({ mood, state }) => {
  const getAuraColor = (): { color1: string; color2: string; shadow: string } => {
    switch (mood) {
      case 'Radiant':
      case 'Affectionate':
        return {
          color1: 'rgba(244, 63, 117, 0.45)',
          color2: 'rgba(251, 113, 133, 0.2)',
          shadow: 'rgba(244, 63, 117, 0.4)',
        };
      case 'Excited':
        return {
          color1: 'rgba(0, 240, 255, 0.45)',
          color2: 'rgba(176, 38, 255, 0.2)',
          shadow: 'rgba(0, 240, 255, 0.4)',
        };
      case 'Bashful':
      case 'Flustered':
        return {
          color1: 'rgba(236, 72, 153, 0.45)',
          color2: 'rgba(244, 114, 182, 0.2)',
          shadow: 'rgba(236, 72, 153, 0.4)',
        };
      case 'Pouting':
        return {
          color1: 'rgba(239, 68, 68, 0.45)',
          color2: 'rgba(249, 115, 22, 0.2)',
          shadow: 'rgba(239, 68, 68, 0.35)',
        };
      case 'Melancholy':
        return {
          color1: 'rgba(99, 102, 241, 0.4)',
          color2: 'rgba(147, 197, 253, 0.15)',
          shadow: 'rgba(99, 102, 241, 0.3)',
        };
      case 'Sleepy':
        return {
          color1: 'rgba(168, 85, 247, 0.35)',
          color2: 'rgba(192, 132, 252, 0.15)',
          shadow: 'rgba(168, 85, 247, 0.3)',
        };
      default:
        return {
          color1: 'rgba(244, 63, 117, 0.25)',
          color2: 'rgba(168, 85, 247, 0.15)',
          shadow: 'rgba(244, 63, 117, 0.25)',
        };
    }
  };

  const aura = getAuraColor();

  return (
    <div
      className="absolute inset-0 pointer-events-none rounded-3xl transition-all duration-700 -z-10"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${aura.color1} 0%, ${aura.color2} 45%, transparent 70%)`,
        filter: 'blur(20px)',
      }}
    />
  );
};
