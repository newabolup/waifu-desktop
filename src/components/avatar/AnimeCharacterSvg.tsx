import React from 'react';
import { AvatarExpression } from '../../types/character';

interface AnimeCharacterSvgProps {
  expression: AvatarExpression;
  isTalking?: boolean;
  className?: string;
}

export const AnimeCharacterSvg: React.FC<AnimeCharacterSvgProps> = ({
  expression,
  isTalking = false,
  className = '',
}) => {
  const currentExpression = isTalking ? 'talking' : expression;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 400 480"
        className="w-full h-full max-h-[440px] drop-shadow-2xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="60%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="100%" stopColor="#fecdd3" />
          </linearGradient>

          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="70%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>

          <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e2238" />
            <stop offset="100%" stopColor="#131627" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Animation styles */}
          <style>
            {`
              @keyframes animeBlink {
                0%, 90%, 100% { transform: scaleY(1); }
                95% { transform: scaleY(0.1); }
              }
              @keyframes animeMouthTalk {
                0%, 100% { transform: scaleY(0.2); }
                50% { transform: scaleY(1); }
              }
              @keyframes animeSway {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-4px) rotate(0.5deg); }
              }
              @keyframes floatZzz {
                0% { opacity: 0; transform: translateY(0) scale(0.6); }
                50% { opacity: 1; transform: translateY(-15px) scale(1); }
                100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
              }
              .eye-blink {
                transform-origin: 200px 185px;
                animation: animeBlink 4s infinite ease-in-out;
              }
              .mouth-talk {
                transform-origin: 200px 240px;
                animation: animeMouthTalk 0.22s infinite ease-in-out;
              }
              .character-sway {
                animation: animeSway 5s infinite ease-in-out;
              }
            `}
          </style>
        </defs>

        <g className="character-sway">
          {/* Back Hair */}
          <path
            d="M 110 180 C 70 260 80 400 130 460 C 140 370 145 280 160 210 Z"
            fill="url(#hairGrad)"
            opacity="0.9"
          />
          <path
            d="M 290 180 C 330 260 320 400 270 460 C 260 370 255 280 240 210 Z"
            fill="url(#hairGrad)"
            opacity="0.9"
          />

          {/* Body & Hoodie */}
          <path
            d="M 130 360 C 140 310 170 300 200 300 C 230 300 260 310 270 360 L 310 480 L 90 480 Z"
            fill="url(#hoodieGrad)"
            stroke="#f43f75"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          {/* Hoodie Collar & Drawstrings */}
          <path
            d="M 170 300 Q 200 335 230 300 Q 200 320 170 300"
            fill="#2c324e"
            stroke="#f472b6"
            strokeWidth="1"
          />
          <line x1="185" y1="320" x2="182" y2="370" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="215" y1="320" x2="218" y2="370" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />

          {/* Neck */}
          <path d="M 185 260 L 185 310 Q 200 315 215 310 L 215 260 Z" fill="url(#skinGrad)" />

          {/* Head & Face */}
          <path
            d="M 130 160 C 130 100 270 100 270 160 C 270 230 230 275 200 275 C 170 275 130 230 130 160 Z"
            fill="url(#skinGrad)"
          />

          {/* Cheeks / Blush */}
          {(currentExpression === 'blushing' ||
            currentExpression === 'happy' ||
            currentExpression === 'talking') && (
            <g>
              <ellipse
                cx="155"
                cy="215"
                rx="18"
                ry="10"
                fill="#f43f75"
                opacity={currentExpression === 'blushing' ? '0.5' : '0.25'}
              />
              <ellipse
                cx="245"
                cy="215"
                rx="18"
                ry="10"
                fill="#f43f75"
                opacity={currentExpression === 'blushing' ? '0.5' : '0.25'}
              />
              {/* Anime blush slash lines */}
              <line x1="147" y1="212" x2="153" y2="218" stroke="#e11d58" strokeWidth="1.5" opacity="0.6" />
              <line x1="155" y1="212" x2="161" y2="218" stroke="#e11d58" strokeWidth="1.5" opacity="0.6" />
              <line x1="239" y1="212" x2="245" y2="218" stroke="#e11d58" strokeWidth="1.5" opacity="0.6" />
              <line x1="247" y1="212" x2="253" y2="218" stroke="#e11d58" strokeWidth="1.5" opacity="0.6" />
            </g>
          )}

          {/* Eyes & Eyebrows */}
          {currentExpression === 'sleepy' ? (
            // Sleepy curved closed lines
            <g stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M 150 185 Q 165 195 180 185" />
              <path d="M 220 185 Q 235 195 250 185" />
              {/* Floating Zzz */}
              <text x="270" y="160" fill="#c084fc" fontSize="22" fontWeight="bold" style={{ animation: 'floatZzz 3s infinite ease-out' }}>Z</text>
              <text x="285" y="140" fill="#f472b6" fontSize="16" fontWeight="bold" style={{ animation: 'floatZzz 3s infinite ease-out 1s' }}>z</text>
            </g>
          ) : currentExpression === 'happy' ? (
            // Joyful closed crescent eyes
            <g stroke="#334155" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 148 188 Q 165 174 182 188" />
              <path d="M 218 188 Q 235 174 252 188" />
              {/* Gentle sparkles */}
              <circle cx="190" cy="170" r="2.5" fill="#fbbf24" />
              <circle cx="210" cy="170" r="2.5" fill="#fbbf24" />
            </g>
          ) : (
            // Open expressive eyes
            <g className={currentExpression === 'idle' ? 'eye-blink' : ''}>
              {/* Left Eye */}
              <ellipse cx="165" cy="186" rx="14" ry="19" fill="#0f172a" />
              <ellipse cx="165" cy="188" rx="12" ry="16" fill="url(#eyeGrad)" />
              <circle cx="165" cy="190" r="6" fill="#1e1b4b" />
              <circle cx="161" cy="180" r="4.5" fill="#ffffff" />
              <circle cx="170" cy="194" r="2.5" fill="#ffffff" opacity="0.9" />

              {/* Right Eye */}
              <ellipse cx="235" cy="186" rx="14" ry="19" fill="#0f172a" />
              <ellipse cx="235" cy="188" rx="12" ry="16" fill="url(#eyeGrad)" />
              <circle cx="235" cy="190" r="6" fill="#1e1b4b" />
              <circle cx="231" cy="180" r="4.5" fill="#ffffff" />
              <circle cx="240" cy="194" r="2.5" fill="#ffffff" opacity="0.9" />

              {/* Eyebrows */}
              {currentExpression === 'angry' ? (
                <g stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <path d="M 150 168 L 180 176" />
                  <path d="M 250 168 L 220 176" />
                  {/* Anime angry tick mark */}
                  <g transform="translate(260, 130) scale(0.7)">
                    <path d="M 0 0 L 15 0 M 15 0 L 15 15 M 15 15 L 0 15 M 0 15 L 0 0" stroke="#f43f75" strokeWidth="3" fill="none" />
                  </g>
                </g>
              ) : currentExpression === 'sad' ? (
                <g stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <path d="M 150 174 Q 165 166 180 172" />
                  <path d="M 250 174 Q 235 166 220 172" />
                </g>
              ) : (
                <g stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none">
                  <path d="M 152 168 Q 165 163 178 168" />
                  <path d="M 222 168 Q 235 163 248 168" />
                </g>
              )}
            </g>
          )}

          {/* Cute Anime Nose */}
          <path d="M 200 212 L 198 217" stroke="#e11d58" strokeWidth="1.5" strokeLinecap="round" />

          {/* Mouth */}
          {currentExpression === 'talking' ? (
            <g className="mouth-talk">
              <ellipse cx="200" cy="242" rx="7" ry="6" fill="#be123c" />
              <ellipse cx="200" cy="244" rx="5" ry="3" fill="#f43f75" />
            </g>
          ) : currentExpression === 'happy' ? (
            <path
              d="M 191 237 Q 200 248 209 237"
              fill="#e11d58"
              stroke="#be123c"
              strokeWidth="1.5"
            />
          ) : currentExpression === 'sad' ? (
            <path
              d="M 193 243 Q 200 236 207 243"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : currentExpression === 'angry' ? (
            <path
              d="M 192 242 Q 200 237 208 241"
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : currentExpression === 'surprised' ? (
            <circle cx="200" cy="242" r="5.5" fill="#be123c" stroke="#881337" strokeWidth="1" />
          ) : currentExpression === 'blushing' ? (
            <path
              d="M 194 238 Q 200 244 206 238"
              fill="none"
              stroke="#e11d58"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            // Idle gentle soft smile
            <path
              d="M 194 239 Q 200 244 206 239"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Front Hair Bangs & Ribbons */}
          <path
            d="M 130 150 C 120 190 140 230 150 250 C 153 230 155 190 160 170 Z"
            fill="url(#hairGrad)"
          />
          <path
            d="M 270 150 C 280 190 260 230 250 250 C 247 230 245 190 240 170 Z"
            fill="url(#hairGrad)"
          />
          {/* Forehead Bangs */}
          <path
            d="M 140 120 Q 180 180 200 145 Q 220 180 260 120 C 230 90 170 90 140 120 Z"
            fill="url(#hairGrad)"
          />
          {/* Hair Ribbon Accessory */}
          <g transform="translate(125, 115) rotate(-15)">
            <path d="M 0 0 Q -15 -10 -25 0 Q -15 10 0 0" fill="#e11d58" />
            <path d="M 0 0 Q -10 -20 0 -30 Q 10 -20 0 0" fill="#e11d58" />
            <circle cx="0" cy="0" r="5" fill="#ffd54f" />
          </g>
        </g>
      </svg>
    </div>
  );
};
