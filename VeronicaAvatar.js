import React, { useState, useEffect } from 'react';

const moodColors = {
  focused:   { iris: '#4F8EF7', hair: '#2D1B0E', accent: '#6366F1', lip: '#C47A6A', blush: '#F4A5A5' },
  motivated: { iris: '#A855F7', hair: '#2D1B0E', accent: '#EC4899', lip: '#D4607A', blush: '#F9A8C9' },
  calm:      { iris: '#14B8A6', hair: '#3B2314', accent: '#14B8A6', lip: '#7ABCB4', blush: '#A5D8D4' },
  urgent:    { iris: '#EF4444', hair: '#2D1B0E', accent: '#F97316', lip: '#D96060', blush: '#F4A5A5' },
};

export default function VeronicaAvatar({ speaking, mood, size = 220 }) {
  const [blink, setBlink] = useState(false);
  const [breatheY, setBreatheY] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(0);
  const c = moodColors[mood] || moodColors.focused;
  const cx = size / 2, cy = size / 2;

  useEffect(() => {
    const iv = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3500 + Math.random() * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let t = 0, raf;
    const loop = () => {
      t += 0.025;
      setBreatheY(Math.sin(t) * 2.5);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!speaking) { setMouthOpen(0); return; }
    let t = 0, raf;
    const loop = () => {
      t += 0.18;
      setMouthOpen(Math.abs(Math.sin(t)) * 7);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  const by = breatheY;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block', filter: `drop-shadow(0 0 24px ${c.accent}44)` }}>
      <defs>
        <radialGradient id="skinG" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FDE8D0"/>
          <stop offset="100%" stopColor="#F5C5A3"/>
        </radialGradient>
        <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={c.accent} stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="hairG" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#6B4C3B"/>
          <stop offset="100%" stopColor={c.hair}/>
        </radialGradient>
        <radialGradient id="irisG" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6"/>
          <stop offset="40%" stopColor={c.iris}/>
          <stop offset="100%" stopColor={c.iris} stopOpacity="0.7"/>
        </radialGradient>
      </defs>

      {/* ambient glow */}
      <ellipse cx={cx} cy={cy} rx={size*0.46} ry={size*0.46} fill="url(#glowG)"/>

      {/* neck */}
      <rect x={cx-13} y={cy+44+by} width="26" height="30" rx="8" fill="url(#skinG)"/>

      {/* outfit / shoulders */}
      <ellipse cx={cx} cy={cy+82+by} rx={size*0.4} ry="26" fill={c.accent} opacity="0.9"/>
      <ellipse cx={cx} cy={cy+82+by} rx={size*0.32} ry="18" fill={c.accent}/>
      {/* collar detail */}
      <path d={`M ${cx-18} ${cy+60+by} L ${cx} ${cy+72+by} L ${cx+18} ${cy+60+by}`}
        stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      {/* hair back layer */}
      <ellipse cx={cx} cy={cy-10+by*0.4} rx={size*0.31} ry={size*0.35} fill="url(#hairG)"/>

      {/* head */}
      <ellipse cx={cx} cy={cy-5+by*0.5} rx={size*0.28} ry={size*0.315} fill="url(#skinG)"/>

      {/* hair top */}
      <path d={`M ${cx-size*0.275} ${cy-12+by*0.4}
        C ${cx-size*0.3} ${cy-size*0.36} ${cx-size*0.1} ${cy-size*0.43} ${cx} ${cy-size*0.42}
        C ${cx+size*0.1} ${cy-size*0.43} ${cx+size*0.3} ${cy-size*0.36} ${cx+size*0.275} ${cy-12}`}
        fill="url(#hairG)"/>
      {/* hair part */}
      <path d={`M ${cx} ${cy-size*0.42+by*0.4} Q ${cx-4} ${cy-size*0.3} ${cx-6} ${cy-size*0.2}`}
        stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" fill="none"/>

      {/* side hair strands */}
      <path d={`M ${cx-size*0.27} ${cy-4+by*0.4} Q ${cx-size*0.38} ${cy+14} ${cx-size*0.3} ${cy+36}`}
        stroke={c.hair} strokeWidth="11" strokeLinecap="round" fill="none"/>
      <path d={`M ${cx+size*0.27} ${cy-4+by*0.4} Q ${cx+size*0.38} ${cy+14} ${cx+size*0.3} ${cy+36}`}
        stroke={c.hair} strokeWidth="11" strokeLinecap="round" fill="none"/>
      {/* hair highlights */}
      <path d={`M ${cx-size*0.24} ${cy-4+by*0.4} Q ${cx-size*0.32} ${cy+10} ${cx-size*0.25} ${cy+28}`}
        stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeLinecap="round" fill="none"/>

      {/* eyebrows */}
      <path d={`M ${cx-27} ${cy-26+by*0.5} Q ${cx-18} ${cy-31} ${cx-9} ${cy-28}`}
        stroke={c.hair} strokeWidth="2.8" strokeLinecap="round" fill="none"/>
      <path d={`M ${cx+9} ${cy-28+by*0.5} Q ${cx+18} ${cy-31} ${cx+27} ${cy-26}`}
        stroke={c.hair} strokeWidth="2.8" strokeLinecap="round" fill="none"/>

      {/* eye whites */}
      <ellipse cx={cx-18} cy={cy-14+by*0.5} rx="10.5" ry={blink ? 1.2 : 9} fill="white"/>
      <ellipse cx={cx+18} cy={cy-14+by*0.5} rx="10.5" ry={blink ? 1.2 : 9} fill="white"/>

      {!blink && <>
        {/* iris */}
        <circle cx={cx-18} cy={cy-14+by*0.5} r="6.5" fill="url(#irisG)"/>
        <circle cx={cx+18} cy={cy-14+by*0.5} r="6.5" fill="url(#irisG)"/>
        {/* pupil */}
        <circle cx={cx-18} cy={cy-14+by*0.5} r="3.2" fill="#111"/>
        <circle cx={cx+18} cy={cy-14+by*0.5} r="3.2" fill="#111"/>
        {/* catchlight */}
        <circle cx={cx-14.5} cy={cy-17+by*0.5} r="2" fill="white"/>
        <circle cx={cx+21.5} cy={cy-17+by*0.5} r="2" fill="white"/>
        <circle cx={cx-20} cy={cy-12+by*0.5} r="0.8" fill="rgba(255,255,255,0.6)"/>
        <circle cx={cx+16} cy={cy-12+by*0.5} r="0.8" fill="rgba(255,255,255,0.6)"/>
      </>}

      {/* eyelid shadow */}
      <ellipse cx={cx-18} cy={cy-21+by*0.5} rx="10" ry="3" fill="rgba(100,60,40,0.15)"/>
      <ellipse cx={cx+18} cy={cy-21+by*0.5} rx="10" ry="3" fill="rgba(100,60,40,0.15)"/>

      {/* nose */}
      <path d={`M ${cx-4} ${cy+3+by*0.5} Q ${cx} ${cy+9} ${cx+4} ${cy+3}`}
        stroke="#D4956A" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <ellipse cx={cx-5} cy={cy+6+by*0.5} rx="2.5" ry="1.5" fill="rgba(180,110,80,0.15)"/>
      <ellipse cx={cx+5} cy={cy+6+by*0.5} rx="2.5" ry="1.5" fill="rgba(180,110,80,0.15)"/>

      {/* lips */}
      {/* upper lip */}
      <path d={`M ${cx-12} ${cy+18+by*0.5}
        Q ${cx-6} ${cy+15} ${cx} ${cy+17}
        Q ${cx+6} ${cy+15} ${cx+12} ${cy+18}`}
        stroke={c.lip} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      {/* lower lip */}
      <path d={`M ${cx-12} ${cy+18+by*0.5}
        Q ${cx} ${cy+22+mouthOpen} ${cx+12} ${cy+18}`}
        stroke={c.lip} strokeWidth="2" fill={mouthOpen > 2 ? "rgba(80,20,20,0.7)" : "none"} strokeLinecap="round"/>
      {/* lip shine */}
      <ellipse cx={cx} cy={cy+19+by*0.5} rx="6" ry="1.5" fill="rgba(255,255,255,0.2)"/>

      {/* blush */}
      <ellipse cx={cx-30} cy={cy-2+by*0.5} rx="10" ry="6" fill={c.blush} opacity="0.35"/>
      <ellipse cx={cx+30} cy={cy-2+by*0.5} rx="10" ry="6" fill={c.blush} opacity="0.35"/>

      {/* earrings */}
      <circle cx={cx-size*0.285} cy={cy+5+by*0.5} r="5" fill={c.accent} opacity="0.9"/>
      <circle cx={cx+size*0.285} cy={cy+5+by*0.5} r="5" fill={c.accent} opacity="0.9"/>
      <circle cx={cx-size*0.285} cy={cy+12+by*0.5} r="3" fill={c.accent} opacity="0.7"/>
      <circle cx={cx+size*0.285} cy={cy+12+by*0.5} r="3" fill={c.accent} opacity="0.7"/>

      {/* speaking pulse rings */}
      {speaking && [1,2,3].map(i => (
        <circle key={i} cx={cx} cy={cy} r={size*0.3 + i*14}
          fill="none" stroke={c.accent} strokeWidth="1"
          opacity={0.15 / i}
          style={{ animation: `ping${i} 1.5s ${i*0.3}s infinite ease-out` }}/>
      ))}
    </svg>
  );
}
