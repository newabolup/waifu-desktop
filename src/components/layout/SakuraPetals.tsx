import React, { useMemo } from 'react';

export const SakuraPetals: React.FC = () => {
  const petals = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: `${(i * 7.5 + Math.random() * 5).toFixed(1)}%`,
      animationDuration: `${(8 + (i % 6) * 2.5).toFixed(1)}s`,
      animationDelay: `${((i * 0.9) % 7).toFixed(1)}s`,
      size: `${(10 + (i % 5) * 3)}px`,
      opacity: (0.25 + (i % 4) * 0.12).toFixed(2),
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <style>{`
        @keyframes petalFall {
          0% {
            transform: translateY(-20px) rotate(0deg) translateX(0px);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(105vh) rotate(360deg) translateX(40px);
            opacity: 0;
          }
        }
      `}</style>
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute text-pink-300 select-none"
          style={{
            left: p.left,
            top: '-30px',
            fontSize: p.size,
            opacity: p.opacity,
            animation: `petalFall ${p.animationDuration} linear infinite`,
            animationDelay: p.animationDelay,
          }}
        >
          🌸
        </div>
      ))}
    </div>
  );
};
