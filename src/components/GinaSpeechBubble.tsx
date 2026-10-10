import React from 'react';

interface GinaSpeechBubbleProps {
  quote: string;
  tag?: string;
  className?: string;
  moodLabel?: string;
}

export const GinaSpeechBubble: React.FC<GinaSpeechBubbleProps> = ({
  quote,
  tag = 'Gina',
  className = '',
  moodLabel,
}) => {
  return (
    <div
      className={`relative p-4 md:p-5 rounded-[22px] rounded-bl-[4px] bg-[#f5f3ed] text-[#061f16] shadow-[0_16px_30px_-14px_rgba(6,31,22,0.45)] border border-[#14502a]/10 flex flex-col gap-1.5 transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#1E6B2E]">
          {tag}
        </span>
        {moodLabel && (
          <span className="text-[10px] font-semibold tracking-wider uppercase text-[#14502a]/60">
            {moodLabel}
          </span>
        )}
      </div>
      <p className="text-[16px] md:text-[17px] font-semibold leading-[1.35] text-[#061f16] text-pretty">
        “{quote}”
      </p>
    </div>
  );
};
