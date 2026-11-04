import React, { useState } from 'react';
import { Game } from '../types/dfs';
import { Copy, Check, Flame, Zap, CloudSun, Star } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameCardProps {
  game: Game;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const [copied, setCopied] = useState(false);

  // Check if high total for the sport
  const isHighTotal =
    (game.sport === 'nba' && game.overUnder >= 230) ||
    (game.sport === 'nfl' && game.overUnder >= 48) ||
    (game.sport === 'nhl' && game.overUnder >= 6.5) ||
    (game.sport === 'cbb' && game.overUnder >= 155) ||
    (game.sport === 'cfb' && game.overUnder >= 56) ||
    (game.sport === 'mlb' && game.overUnder >= 9.5);

  const handleCopy = () => {
    const text = `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} | Spread: ${game.spread.text} | O/U: ${game.overUnder} (Implied: ${game.awayTeam.abbreviation} ${game.impliedAwayScore.toFixed(1)}, ${game.homeTeam.abbreviation} ${game.impliedHomeScore.toFixed(1)}) | Time: ${game.gameTime}`;
    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-800/90 rounded-xl border border-slate-700/80 p-3.5 sm:p-4 text-white shadow-sm hover:border-slate-600 transition-all">
      {/* Top row: Status, Time, High total badge, Copy button */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-700/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">{game.gameTime}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/80 text-slate-300 font-medium">
            {game.status}
          </span>
          {isHighTotal && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              HIGH TOTAL
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          title="Copy game Vegas lines"
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/70 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Teams and Implied Scores */}
      <div className="py-3 grid grid-cols-2 gap-3 sm:gap-4 items-center">
        {/* Away Team */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: game.awayTeam.logoColor || '#64748b' }}
            />
            <span className="font-bold text-base sm:text-lg text-white tracking-tight">
              {game.awayTeam.abbreviation}
            </span>
            {game.awayTeam.record && (
              <span className="text-[11px] text-slate-400">({game.awayTeam.record})</span>
            )}
          </div>
          <span className="text-xs text-slate-400 truncate mt-0.5">{game.awayTeam.name}</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Implied:</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              {game.impliedAwayScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Home Team */}
        <div className="flex flex-col text-right sm:text-left">
          <div className="flex items-center gap-2 justify-end sm:justify-start">
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: game.homeTeam.logoColor || '#64748b' }}
            />
            <span className="font-bold text-base sm:text-lg text-white tracking-tight">
              {game.homeTeam.abbreviation}
            </span>
            {game.homeTeam.record && (
              <span className="text-[11px] text-slate-400">({game.homeTeam.record})</span>
            )}
          </div>
          <span className="text-xs text-slate-400 truncate mt-0.5">{game.homeTeam.name}</span>
          <div className="mt-1 flex items-baseline gap-1 justify-end sm:justify-start">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Implied:</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              {game.impliedHomeScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Vegas Odds Box */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Spread */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Spread:</span>
          <span className="font-bold text-amber-300 font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            {game.spread.text}
          </span>
        </div>

        {/* Over/Under Total */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Over/Under:</span>
          <span className="font-bold text-emerald-300 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            O/U {game.overUnder}
          </span>
        </div>

        {/* Pace */}
        {game.paceFactor && (
          <div className="flex items-center gap-1.5 text-slate-300">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px] font-medium">Pace: {game.paceFactor}</span>
          </div>
        )}
      </div>

      {/* Starting Lineups Section */}
      {game.startingLineups && (
        <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Starting Lineups
            </span>
            <span className="text-[10px] text-slate-400">
              {game.startingLineups.away.status === 'Confirmed' && game.startingLineups.home.status === 'Confirmed'
                ? 'Both Lineups Confirmed'
                : 'Projected / Active Warmups'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {/* Away Lineup */}
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">{game.awayTeam.abbreviation} Lineup</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    game.startingLineups.away.status === 'Confirmed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {game.startingLineups.away.status}
                </span>
              </div>
              <p className="text-slate-300 leading-snug">
                {game.startingLineups.away.starters.join(', ')}
              </p>
              {game.startingLineups.away.keyNote && (
                <span className="block text-[10px] text-amber-300/90 mt-1 font-medium">
                  {game.startingLineups.away.keyNote}
                </span>
              )}
            </div>

            {/* Home Lineup */}
            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">{game.homeTeam.abbreviation} Lineup</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    game.startingLineups.home.status === 'Confirmed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {game.startingLineups.home.status}
                </span>
              </div>
              <p className="text-slate-300 leading-snug">
                {game.startingLineups.home.starters.join(', ')}
              </p>
              {game.startingLineups.home.keyNote && (
                <span className="block text-[10px] text-amber-300/90 mt-1 font-medium">
                  {game.startingLineups.home.keyNote}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional game notes / weather / stack rating */}
      {(game.keyNotes || game.weatherNote || game.stackRating) && (
        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-col gap-1.5 text-[11px]">
          {game.keyNotes && (
            <p className="text-slate-300 leading-snug">
              <span className="font-semibold text-slate-400">DFS Intel:</span> {game.keyNotes}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 pt-0.5">
            {game.weatherNote && (
              <div className="flex items-center gap-1 text-slate-300">
                <CloudSun className="w-3.5 h-3.5 text-amber-300" />
                <span>{game.weatherNote}</span>
              </div>
            )}
            {game.stackRating && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-slate-400">Stack:</span>
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < (game.stackRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
