import React, { useState } from 'react';
import { SlateData } from '../types/dfs';
import { Copy, Check, X, FileText, Smartphone, Type } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ScreenCopyBoardProps {
  slate: SlateData;
  onClose: () => void;
}

export const ScreenCopyBoard: React.FC<ScreenCopyBoardProps> = ({ slate, onClose }) => {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  // Format Vegas lines
  const vegasText = slate.games
    .map(
      (g) =>
        `• ${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation} | Spread: ${g.spread.text} | O/U: ${g.overUnder} | Implied: ${g.awayTeam.abbreviation} ${g.impliedAwayScore.toFixed(1)}, ${g.homeTeam.abbreviation} ${g.impliedHomeScore.toFixed(1)} (${g.gameTime})`
    )
    .join('\n');

  // Format Value Picks
  const valuesText = slate.valuePicks
    .map(
      (v, idx) =>
        `${idx + 1}. ${v.playerName} (${v.position}, ${v.team}) ${v.opponent} - $${v.salaryDK?.toLocaleString() || 'N/A'} DK -> Proj: ${v.projectedPoints} FP (${v.valueMultiplier}x Value) [Vs Def #${v.defenseRankAgainstPos}]`
    )
    .join('\n');

  // Format Weak Defenses
  const matchupsText = slate.matchups
    .map(
      (m) =>
        `• Target ${m.targetTeam} vs ${m.position} (#${m.defenseRank} Def). Stat: ${m.pointsAllowedStat}. Beneficiaries: ${m.beneficiaryPlayers.join(', ')}`
    )
    .join('\n');

  const fullText = `🏆 ${slate.sportName.toUpperCase()} DFS SLATE CHEAT SHEET - ${slate.dateStr.toUpperCase()}
============================================================
VEGAS TOTALS & SPREADS:
${vegasText}

TOP VALUE PLAYS & SLEEPERS:
${valuesText}

EASIEST MATCHUPS (TARGET DEFENSES):
${matchupsText}

NOTE: ${slate.slateNote}
Source: Free search grounding (ESPN, Rotowire, Reddit r/dfsports, Vegas lines)
============================================================`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden mx-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Screen Copy Sheet (Mobile Optimized)
              </h3>
              <p className="text-[11px] text-slate-400">
                Put text on screen to copy directly into your DFS app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size toggle */}
            <button
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              title="Toggle font size"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold">{fontSize}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick copy bar */}
        <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleCopy(fullText, 'all')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-all active:scale-95"
          >
            {copyStatus === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied All!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Entire Sheet</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleCopy(vegasText, 'vegas')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1 shrink-0 border border-slate-700 transition-colors"
          >
            {copyStatus === 'vegas' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>Copy Vegas Only</span>
          </button>

          <button
            onClick={() => handleCopy(valuesText, 'values')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1 shrink-0 border border-slate-700 transition-colors"
          >
            {copyStatus === 'values' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>Copy Value Picks</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 bg-slate-950">
          <pre
            className={`font-mono text-emerald-300/90 whitespace-pre-wrap select-all leading-relaxed ${
              fontSize === 'large' ? 'text-sm' : 'text-xs'
            }`}
          >
            {fullText}
          </pre>
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Tip: Tap text above to select all or use the copy buttons</span>
          <button
            onClick={() => handleCopy(fullText, 'all')}
            className="text-emerald-400 font-bold hover:underline"
          >
            Copy Sheet Now
          </button>
        </div>
      </div>
    </div>
  );
};
