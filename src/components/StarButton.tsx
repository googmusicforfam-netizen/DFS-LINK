import React from 'react';
import { Star } from 'lucide-react';

interface StarButtonProps {
  isStarred: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StarButton({
  isStarred,
  onToggle,
  size = 'md',
  showLabel = false,
  className = '',
}: StarButtonProps) {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const padSizes = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      title={isStarred ? 'Remove from Watchlist' : 'Star player to receive injury & price alerts'}
      aria-label={isStarred ? 'Unstar player' : 'Star player for alerts'}
      className={`rounded-lg transition-all active:scale-90 flex items-center gap-1 ${padSizes[size]} ${
        isStarred
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 shadow-sm shadow-amber-500/20'
          : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/80 border border-transparent hover:border-slate-700'
      } ${className}`}
    >
      <Star
        className={`${iconSizes[size]} transition-transform ${
          isStarred ? 'fill-amber-400 text-amber-400 scale-105' : 'text-current'
        }`}
      />
      {showLabel && (
        <span className="text-[11px] font-bold">
          {isStarred ? 'Starred' : 'Watch'}
        </span>
      )}
    </button>
  );
}
