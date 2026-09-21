import React, { useId } from "react";

interface NexaMindIconProps {
  className?: string;
  size?: number | string;
  showGlow?: boolean;
}

/**
 * NexaMindIcon — Modern geometric Neural Nexus mark
 * Combines dynamic continuous energy ribbons forming an "N" 
 * with a luminous central cognitive synapse spark ("Mind").
 */
export const NexaMindIcon: React.FC<NexaMindIconProps> = ({
  className = "w-6 h-6",
  size,
  showGlow = true,
}) => {
  const id = useId();
  const cleanId = id.replace(/:/g, "_");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NexaMind"
    >
      <defs>
        {/* Ambient Neural Core Glow */}
        <radialGradient
          id={`glow-${cleanId}`}
          cx="16"
          cy="16"
          r="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#818cf8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        {/* Left Energy Pillar: Deep Indigo -> Electric Violet */}
        <linearGradient
          id={`left-${cleanId}`}
          x1="6"
          y1="25"
          x2="15"
          y2="7"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="40%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        {/* Diagonal Quantum Bridge: Radiant Violet -> Cyan */}
        <linearGradient
          id={`bridge-${cleanId}`}
          x1="10"
          y1="7"
          x2="22"
          y2="25"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="35%" stopColor="#6366f1" />
          <stop offset="75%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Right Ascending Pillar: Neon Cyan -> Cyber Indigo -> Light Purple */}
        <linearGradient
          id={`right-${cleanId}`}
          x1="18"
          y1="25"
          x2="26"
          y2="7"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Bloom */}
      {showGlow && (
        <circle cx="16" cy="16" r="13" fill={`url(#glow-${cleanId})`} />
      )}

      {/* Left Pillar */}
      <path
        d="M8 24V10.5C8 8.567 9.567 7 11.5 7C13.433 7 15 8.567 15 10.5V19.5"
        stroke={`url(#left-${cleanId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Diagonal Crossing Bridge */}
      <path
        d="M11.5 7.5L20.5 24.5"
        stroke={`url(#bridge-${cleanId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Right Pillar */}
      <path
        d="M17 12.5V21.5C17 23.433 18.567 25 20.5 25C22.433 25 24 23.433 24 21.5V8"
        stroke={`url(#right-${cleanId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cognitive Synapse Spark (The "Mind" Insight Spark) */}
      <path
        d="M16 11.5C16 13.9 14.1 16 11.7 16C14.1 16 16 18.1 16 20.5C16 18.1 17.9 16 20.3 16C17.9 16 16 13.9 16 11.5Z"
        fill="#ffffff"
      />
      <circle cx="16" cy="16" r="1.3" fill="#38bdf8" />
    </svg>
  );
};

interface NexaMindLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  badgeClassName?: string;
}

/**
 * NexaMindLogo — Complete brand lockup with container badge and typography
 */
export const NexaMindLogo: React.FC<NexaMindLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
  badgeClassName = "",
}) => {
  const sizeMap = {
    sm: {
      badge: "h-7 w-7 rounded-lg",
      icon: "w-4 h-4",
      text: "text-sm",
    },
    md: {
      badge: "h-8 w-8 rounded-xl",
      icon: "w-4.5 h-4.5",
      text: "text-[15px]",
    },
    lg: {
      badge: "h-12 w-12 rounded-2xl",
      icon: "w-7 h-7",
      text: "text-xl",
    },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${current.badge} bg-gradient-to-br from-[#1e1b4b] via-[#16143c] to-[#0c0b1e] border border-violet-500/30 flex items-center justify-center shadow-md shadow-violet-950/50 relative overflow-hidden group-hover:border-violet-400/50 group-hover:shadow-violet-800/30 transition-all ${badgeClassName}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 via-transparent to-cyan-400/10 pointer-events-none" />
        <NexaMindIcon className={current.icon} />
      </div>

      {showText && (
        <span
          className={`${current.text} font-bold tracking-tight text-white flex items-center select-none`}
        >
          Nexa
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Mind
          </span>
        </span>
      )}
    </div>
  );
};
