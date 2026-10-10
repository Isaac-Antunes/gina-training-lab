import React from 'react';
import { GinaMood } from '../types/crm';

interface GinaCharacterProps {
  mood?: GinaMood;
  size?: 'hero' | 'large' | 'medium' | 'small' | 'avatar' | 'mini';
  className?: string;
  animate?: boolean;
}

export const GinaCharacter: React.FC<GinaCharacterProps> = ({
  mood = 'listening',
  size = 'medium',
  className = '',
  animate = true,
}) => {
  // Dimensions helper
  const dimensions = {
    hero: { width: 280, height: 350 },
    large: { width: 200, height: 250 },
    medium: { width: 150, height: 188 },
    small: { width: 80, height: 100 },
    avatar: { width: 44, height: 44 },
    mini: { width: 28, height: 28 },
  }[size];

  const isAvatar = size === 'avatar' || size === 'mini';
  const floatClass = animate && !isAvatar ? 'float' : '';

  // Unique ID prefix to avoid SVG gradient ID collisions
  const uid = React.useId().replace(/:/g, '');

  // Render SVG based on mood
  if (mood === 'reading_rhythm') {
    // 02 · Reading the rhythm (Thinking, hand on chin)
    return (
      <svg
        viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label="Gina, analisando o ritmo"
        className={`overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id={`bd-think-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fdc6e" />
            <stop offset=".45" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`fc-think-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset=".75" stopColor="#f5f3ed" />
            <stop offset="1" stopColor="#e3dccb" />
          </radialGradient>
          <linearGradient id={`lb-think-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`sh-think-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
            <stop offset="1" stopColor="#061f16" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!isAvatar && <ellipse cx="121" cy="236" rx="52.0" ry="7" fill={`url(#sh-think-${uid})`} />}
        {!isAvatar && (
          <g>
            <circle cx="200" cy="60" r="5" fill="#f5f3ed" stroke="#061f16" strokeWidth="2" />
            <circle cx="212" cy="40" r="8" fill="#f5f3ed" stroke="#061f16" strokeWidth="2" />
            <circle cx="224" cy="14" r="12" fill="#f5f3ed" stroke="#061f16" strokeWidth="2" />
          </g>
        )}
        <g className={floatClass}>
          <g transform="translate(0,0)">
            {/* Legs */}
            <path d="M108,166 Q104,196 100,226" fill="none" stroke={`url(#lb-think-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M108,166 Q104,196 100,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <path d="M134,166 Q138,196 142,226" fill="none" stroke={`url(#lb-think-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M134,166 Q138,196 142,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            {/* Shoes */}
            <g transform="rotate(0 98 230)">
              <ellipse cx="93.2" cy="230" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="90.2" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            <g transform="rotate(0 144 230)">
              <ellipse cx="148.8" cy="230" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="145.8" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            {/* Outer @ curve */}
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-think-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
            {/* Face bowl */}
            <circle cx="120" cy="128" r="40" fill={`url(#fc-think-${uid})`} stroke={`url(#bd-think-${uid})`} strokeWidth="26" />
            <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
            {/* Cheeks */}
            <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            {/* Eyes looking up/thinking */}
            <ellipse cx="109" cy="118" rx="5.6" ry="7.2" fill="#0b1410" />
            <circle cx="110.8" cy="115" r="2.1" fill="#fff" />
            <circle cx="107.4" cy="121.5" r=".9" fill="#fff" opacity=".8" />
            <ellipse cx="133" cy="118" rx="5.6" ry="7.2" fill="#0b1410" />
            <circle cx="134.8" cy="115" r="2.1" fill="#fff" />
            <circle cx="131.4" cy="121.5" r=".9" fill="#fff" opacity=".8" />
            {/* Thoughtful mouth */}
            <path d="M113,140 Q118,138 124,140" fill="none" stroke="#0b1410" strokeWidth="2.8" strokeLinecap="round" />
            {/* Left arm */}
            <path d="M82,140 Q60,166 66,190" fill="none" stroke={`url(#lb-think-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82,140 Q60,166 66,190" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="67" cy="194" r="9.5" fill={`url(#bd-think-${uid})`} />
            <circle cx="64.5" cy="191" r="3.04" fill="#fff" opacity=".45" />
            {/* Right arm on chin */}
            <path d="M166,152 Q170,186 134,174" fill="none" stroke={`url(#lb-think-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M166,152 Q170,186 134,174" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="132" cy="172" r="9.5" fill={`url(#bd-think-${uid})`} />
            <circle cx="129.5" cy="169" r="3.04" fill="#fff" opacity=".45" />
          </g>
        </g>
      </svg>
    );
  }

  if (mood === 'heads_up') {
    // 03 · Heads-up / Alert (Points up, exclamation bubble)
    return (
      <svg
        viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label="Gina, alerta de governança"
        className={`overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id={`bd-alert-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fdc6e" />
            <stop offset=".45" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`fc-alert-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset=".75" stopColor="#f5f3ed" />
            <stop offset="1" stopColor="#e3dccb" />
          </radialGradient>
          <linearGradient id={`lb-alert-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`sh-alert-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
            <stop offset="1" stopColor="#061f16" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!isAvatar && <ellipse cx="121" cy="236" rx="45.6" ry="7" fill={`url(#sh-alert-${uid})`} />}
        {!isAvatar && (
          <g transform="translate(206,40)">
            <circle r="18" fill="#061f16" />
            <text y="8" textAnchor="middle" fontFamily="Bagel Fat One, Arial Black, sans-serif" fontSize="24" fill="#7FC453">!</text>
          </g>
        )}
        <g className={floatClass}>
          <g transform="translate(0,-8)">
            {/* Legs on tiptoe */}
            <path d="M108,166 Q105,192 104,214" fill="none" stroke={`url(#lb-alert-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M108,166 Q105,192 104,214" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <path d="M134,166 Q137,192 138,214" fill="none" stroke={`url(#lb-alert-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M134,166 Q137,192 138,214" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <g transform="rotate(-14 102 218)">
              <ellipse cx="97.2" cy="218" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="94.2" cy="214.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            <g transform="rotate(14 140 218)">
              <ellipse cx="144.8" cy="218" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="141.8" cy="214.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            {/* Outer body curve */}
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-alert-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
            {/* Arms pointing up */}
            <path d="M82,128 Q48,110 40,70" fill="none" stroke={`url(#lb-alert-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82,128 Q48,110 40,70" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="40" cy="66" r="9.5" fill={`url(#bd-alert-${uid})`} />
            <circle cx="37.5" cy="63" r="3.04" fill="#fff" opacity=".45" />
            <path d="M166,150 Q196,166 206,150" fill="none" stroke={`url(#lb-alert-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M166,150 Q196,166 206,150" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="208" cy="146" r="9.5" fill={`url(#bd-alert-${uid})`} />
            <circle cx="205.5" cy="143" r="3.04" fill="#fff" opacity=".45" />
            {/* Face bowl */}
            <circle cx="120" cy="128" r="40" fill={`url(#fc-alert-${uid})`} stroke={`url(#bd-alert-${uid})`} strokeWidth="26" />
            <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            {/* Wide alert eyes */}
            <ellipse cx="106" cy="121" rx="5.6" ry="8.4" fill="#0b1410" />
            <circle cx="107.8" cy="118" r="2.1" fill="#fff" />
            <circle cx="104.4" cy="124.5" r=".9" fill="#fff" opacity=".8" />
            <ellipse cx="130" cy="121" rx="5.6" ry="8.4" fill="#0b1410" />
            <circle cx="131.8" cy="118" r="2.1" fill="#fff" />
            <circle cx="128.4" cy="124.5" r=".9" fill="#fff" opacity=".8" />
            {/* Raised eyebrows */}
            <path d="M98,108 Q105,103 112,107 M124,107 Q131,103 138,108" fill="none" stroke="#0b1410" strokeWidth="2.6" strokeLinecap="round" />
            {/* Surprised round mouth */}
            <ellipse cx="118" cy="141" rx="4" ry="4.6" fill="#0b1410" />
          </g>
        </g>
      </svg>
    );
  }

  if (mood === 'drafting') {
    // 04 · Drafting (Typing on phone, speech bubble with animated dots)
    return (
      <svg
        viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label="Gina, redigindo"
        className={`overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id={`bd-draft-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fdc6e" />
            <stop offset=".45" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`fc-draft-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset=".75" stopColor="#f5f3ed" />
            <stop offset="1" stopColor="#e3dccb" />
          </radialGradient>
          <linearGradient id={`lb-draft-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`sh-draft-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
            <stop offset="1" stopColor="#061f16" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!isAvatar && <ellipse cx="121" cy="236" rx="52.0" ry="7" fill={`url(#sh-draft-${uid})`} />}
        {!isAvatar && (
          <g transform="translate(196,42)">
            <rect x="-26" y="-14" width="52" height="28" rx="14" fill="#f5f3ed" stroke="#061f16" strokeWidth="2.5" />
            <circle className="dot d0" cx="-12" cy="0" r="3.6" fill="#061f16" />
            <circle className="dot d1" cx="0" cy="0" r="3.6" fill="#061f16" />
            <circle className="dot d2" cx="12" cy="0" r="3.6" fill="#061f16" />
          </g>
        )}
        <g className={floatClass}>
          <g transform="translate(0,0)">
            {/* Legs */}
            <path d="M108,166 Q104,196 100,226" fill="none" stroke={`url(#lb-draft-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M108,166 Q104,196 100,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <path d="M134,166 Q138,196 142,226" fill="none" stroke={`url(#lb-draft-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M134,166 Q138,196 142,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <g transform="rotate(0 98 230)">
              <ellipse cx="93.2" cy="230" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="90.2" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            <g transform="rotate(0 144 230)">
              <ellipse cx="148.8" cy="230" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="145.8" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            {/* Outer body curve */}
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-draft-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
            {/* Face bowl */}
            <circle cx="120" cy="128" r="40" fill={`url(#fc-draft-${uid})`} stroke={`url(#bd-draft-${uid})`} strokeWidth="26" />
            <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            {/* Happy focused eyes */}
            <path d="M100,128 Q106,133 112,128 M124,128 Q130,133 136,128" fill="none" stroke="#0b1410" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M113,140 Q118,143 123,140" fill="none" stroke="#0b1410" strokeWidth="2.8" strokeLinecap="round" />
            {/* Arms holding phone */}
            <path d="M82,142 Q84,180 110,184" fill="none" stroke={`url(#lb-draft-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82,142 Q84,180 110,184" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="112" cy="184" r="9.5" fill={`url(#bd-draft-${uid})`} />
            <circle cx="109.5" cy="181" r="3.04" fill="#fff" opacity=".45" />
            <path d="M166,152 Q160,188 134,186" fill="none" stroke={`url(#lb-draft-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M166,152 Q160,188 134,186" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="132" cy="186" r="9.5" fill={`url(#bd-draft-${uid})`} />
            <circle cx="129.5" cy="183" r="3.04" fill="#fff" opacity=".45" />
            {/* Smartphone device */}
            <g transform="rotate(-8 122 176)">
              <rect x="108" y="160" width="28" height="44" rx="6" fill="#061f16" />
              <rect x="111" y="166" width="22" height="30" rx="3" fill="#7FC453" />
              <rect x="114" y="170" width="14" height="3" rx="1.5" fill="#061f16" opacity=".6" />
              <rect x="114" y="176" width="10" height="3" rx="1.5" fill="#061f16" opacity=".6" />
            </g>
          </g>
        </g>
      </svg>
    );
  }

  if (mood === 'win_back') {
    // 05 · Win-back / Celebration (Jumps, confetti)
    return (
      <svg
        viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label="Gina, comemoração"
        className={`overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id={`bd-win-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fdc6e" />
            <stop offset=".45" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`fc-win-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset=".75" stopColor="#f5f3ed" />
            <stop offset="1" stopColor="#e3dccb" />
          </radialGradient>
          <linearGradient id={`lb-win-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`sh-win-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
            <stop offset="1" stopColor="#061f16" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!isAvatar && <ellipse cx="121" cy="236" rx="34.4" ry="7" fill={`url(#sh-win-${uid})`} />}
        {!isAvatar && (
          <g>
            <rect className="conf c0" x="25" y="37" width="10" height="6" rx="2" fill="#061f16" transform="rotate(20 30 40)" />
            <rect className="conf c1" x="205" y="27" width="10" height="6" rx="2" fill="#7FC453" transform="rotate(-30 210 30)" />
            <rect className="conf c2" x="15" y="137" width="10" height="6" rx="2" fill="#9fdc6e" transform="rotate(45 20 140)" />
            <rect className="conf c0" x="217" y="117" width="10" height="6" rx="2" fill="#061f16" transform="rotate(10 222 120)" />
            <rect className="conf c1" x="65" y="13" width="10" height="6" rx="2" fill="#7FC453" transform="rotate(-15 70 16)" />
            <rect className="conf c2" x="175" y="211" width="10" height="6" rx="2" fill="#9fdc6e" transform="rotate(30 180 214)" />
            <rect className="conf c1" x="31" y="207" width="10" height="6" rx="2" fill="#7FC453" transform="rotate(60 36 210)" />
            <rect className="conf c0" x="115" y="5" width="10" height="6" rx="2" fill="#061f16" transform="rotate(0 120 8)" />
          </g>
        )}
        <g className={floatClass}>
          <g transform="translate(0,-22)">
            {/* Jumping legs */}
            <path d="M108,166 Q96,186 86,198" fill="none" stroke={`url(#lb-win-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M108,166 Q96,186 86,198" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <path d="M134,166 Q148,186 158,196" fill="none" stroke={`url(#lb-win-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M134,166 Q148,186 158,196" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <g transform="rotate(-28 84 202)">
              <ellipse cx="79.2" cy="202" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="76.2" cy="198.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            <g transform="rotate(28 160 200)">
              <ellipse cx="164.8" cy="200" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="161.8" cy="196.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            {/* Outer body */}
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-win-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
            {/* Cheering arms up */}
            <path d="M82,124 Q40,104 26,62" fill="none" stroke={`url(#lb-win-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82,124 Q40,104 26,62" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="25" cy="58" r="9.5" fill={`url(#bd-win-${uid})`} />
            <circle cx="22.5" cy="55" r="3.04" fill="#fff" opacity=".45" />
            <path d="M166,146 Q214,130 222,90" fill="none" stroke={`url(#lb-win-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M166,146 Q214,130 222,90" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="222" cy="86" r="9.5" fill={`url(#bd-win-${uid})`} />
            <circle cx="219.5" cy="83" r="3.04" fill="#fff" opacity=".45" />
            {/* Face */}
            <circle cx="120" cy="128" r="40" fill={`url(#fc-win-${uid})`} stroke={`url(#bd-win-${uid})`} strokeWidth="26" />
            <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            {/* Ecstatic arch eyes */}
            <path d="M100,126 Q106,117 112,126 M124,126 Q130,117 136,126" fill="none" stroke="#0b1410" strokeWidth="3.4" strokeLinecap="round" />
            {/* Open happy laughing mouth */}
            <path d="M108,135 Q118,150 128,135 Z" fill="#0b1410" />
            <path d="M113,141 Q118,146 123,141" fill="#e97a6e" />
          </g>
        </g>
      </svg>
    );
  }

  if (mood === 'quiet_hours') {
    // 06 · Quiet hours / Resting (Sitting down, zz indicator)
    return (
      <svg
        viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label="Gina, repouso"
        className={`overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id={`bd-rest-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9fdc6e" />
            <stop offset=".45" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`fc-rest-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset=".75" stopColor="#f5f3ed" />
            <stop offset="1" stopColor="#e3dccb" />
          </radialGradient>
          <linearGradient id={`lb-rest-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3e9d4a" />
            <stop offset="1" stopColor="#14502a" />
          </linearGradient>
          <radialGradient id={`sh-rest-${uid}`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
            <stop offset="1" stopColor="#061f16" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!isAvatar && <ellipse cx="110" cy="218" rx="42.4" ry="7" fill={`url(#sh-rest-${uid})`} />}
        {!isAvatar && (
          <text className="zz" x="186" y="58" fontFamily="Bagel Fat One, Arial Black, sans-serif" fontSize="28" fill="#061f16">
            z<tspan fontSize="20" dy="-14">z</tspan>
          </text>
        )}
        <g className={floatClass}>
          <g transform="translate(0,12)">
            {/* Sitting legs */}
            <path d="M108,166 Q96,196 72,206" fill="none" stroke={`url(#lb-rest-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M108,166 Q96,196 72,206" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <path d="M134,166 Q130,196 108,210" fill="none" stroke={`url(#lb-rest-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M134,166 Q130,196 108,210" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <g transform="rotate(0 66 208)">
              <ellipse cx="61.2" cy="208" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="58.2" cy="204.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            <g transform="rotate(0 102 212)">
              <ellipse cx="97.2" cy="212" rx="15" ry="8.5" fill="#061f16" />
              <ellipse cx="94.2" cy="208.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
            </g>
            {/* Outer body */}
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-rest-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
            {/* Resting arms */}
            <path d="M82,142 Q62,168 72,188" fill="none" stroke={`url(#lb-rest-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M82,142 Q62,168 72,188" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="74" cy="191" r="9.5" fill={`url(#bd-rest-${uid})`} />
            <circle cx="71.5" cy="188" r="3.04" fill="#fff" opacity=".45" />
            <path d="M166,152 Q186,180 176,194" fill="none" stroke={`url(#lb-rest-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M166,152 Q186,180 176,194" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
            <circle cx="174" cy="196" r="9.5" fill={`url(#bd-rest-${uid})`} />
            <circle cx="171.5" cy="193" r="3.04" fill="#fff" opacity=".45" />
            {/* Face */}
            <circle cx="120" cy="128" r="40" fill={`url(#fc-rest-${uid})`} stroke={`url(#bd-rest-${uid})`} strokeWidth="26" />
            <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
            {/* Sleeping closed eyes */}
            <path d="M100,124 Q106,129 112,124 M124,124 Q130,129 136,124" fill="none" stroke="#0b1410" strokeWidth="3.2" strokeLinecap="round" />
            {/* Small relaxed mouth */}
            <ellipse cx="119" cy="140" rx="2.6" ry="2" fill="#0b1410" />
          </g>
        </g>
      </svg>
    );
  }

  // Default: 01 · Listening / Idle (Waves hi, calm smiling)
  return (
    <svg
      viewBox={isAvatar ? '30 20 190 170' : '0 0 240 300'}
      width={dimensions.width}
      height={dimensions.height}
      role="img"
      aria-label="Gina, ouvindo"
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={`bd-idle-${uid}`} x1="40" y1="30" x2="210" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9fdc6e" />
          <stop offset=".45" stopColor="#3e9d4a" />
          <stop offset="1" stopColor="#14502a" />
        </linearGradient>
        <radialGradient id={`fc-idle-${uid}`} cx="112" cy="114" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset=".75" stopColor="#f5f3ed" />
          <stop offset="1" stopColor="#e3dccb" />
        </radialGradient>
        <linearGradient id={`lb-idle-${uid}`} x1="0" y1="150" x2="0" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3e9d4a" />
          <stop offset="1" stopColor="#14502a" />
        </linearGradient>
        <radialGradient id={`sh-idle-${uid}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#061f16" stopOpacity=".28" />
          <stop offset="1" stopColor="#061f16" stopOpacity="0" />
        </radialGradient>
      </defs>
      {!isAvatar && <ellipse cx="121" cy="236" rx="52.0" ry="7" fill={`url(#sh-idle-${uid})`} />}
      <g className={floatClass}>
        <g transform="translate(0,0)">
          {/* Straight idle legs */}
          <path d="M108,166 Q104,196 100,226" fill="none" stroke={`url(#lb-idle-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M108,166 Q104,196 100,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
          <path d="M134,166 Q138,196 142,226" fill="none" stroke={`url(#lb-idle-${uid})`} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M134,166 Q138,196 142,226" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
          {/* Chunky black shoes */}
          <g transform="rotate(0 98 230)">
            <ellipse cx="93.2" cy="230" rx="15" ry="8.5" fill="#061f16" />
            <ellipse cx="90.2" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
          </g>
          <g transform="rotate(0 144 230)">
            <ellipse cx="148.8" cy="230" rx="15" ry="8.5" fill="#061f16" />
            <ellipse cx="145.8" cy="226.5" rx="7" ry="2.6" fill="#fff" opacity=".25" />
          </g>
          {/* The @ loop (tail as hair) */}
          <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke={`url(#bd-idle-${uid})`} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M160,88 L160,140 Q170,170 196,154 C224,120 214,52 160,40 C108,30 58,52 48,104 C44,124 50,142 60,152" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" transform="translate(-3,-4)" strokeDasharray="0 40 120 400" />
          {/* Left waving arm */}
          <path d="M82,132 Q44,126 30,92" fill="none" stroke={`url(#lb-idle-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M82,132 Q44,126 30,92" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
          <circle cx="29" cy="88" r="9.5" fill={`url(#bd-idle-${uid})`} />
          <circle cx="26.5" cy="85" r="3.04" fill="#fff" opacity=".45" />
          {/* Right resting arm */}
          <path d="M166,150 Q186,176 180,198" fill="none" stroke={`url(#lb-idle-${uid})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M166,150 Q186,176 180,198" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" transform="translate(-2,-2)" />
          <circle cx="179" cy="202" r="9.5" fill={`url(#bd-idle-${uid})`} />
          <circle cx="176.5" cy="199" r="3.04" fill="#fff" opacity=".45" />
          {/* Face bowl */}
          <circle cx="120" cy="128" r="40" fill={`url(#fc-idle-${uid})`} stroke={`url(#bd-idle-${uid})`} strokeWidth="26" />
          <path d="M92,100 A40,40 0 0 1 132,90" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="5" strokeLinecap="round" />
          {/* Cheeks */}
          <ellipse cx="98" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
          <ellipse cx="139" cy="136" rx="7" ry="4.4" fill="#ef9a8a" opacity=".45" />
          {/* Big friendly eyes */}
          <ellipse cx="106" cy="122" rx="5.6" ry="7.2" fill="#0b1410" />
          <circle cx="107.8" cy="119" r="2.1" fill="#fff" />
          <circle cx="104.4" cy="125.5" r=".9" fill="#fff" opacity=".8" />
          <ellipse cx="130" cy="122" rx="5.6" ry="7.2" fill="#0b1410" />
          <circle cx="131.8" cy="119" r="2.1" fill="#fff" />
          <circle cx="128.4" cy="125.5" r=".9" fill="#fff" opacity=".8" />
          {/* Warm smile */}
          <path d="M111,137 Q118,144 125,137" fill="none" stroke="#0b1410" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};
