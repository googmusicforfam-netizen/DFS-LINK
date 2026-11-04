import React, { useState } from 'react';
import { X, ClipboardPaste, Sparkles, Copy, Check, ArrowRight, BookOpen } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface PasteSlateModalProps {
  onClose: () => void;
  sport: string;
}

export const PasteSlateModal: React.FC<PasteSlateModalProps> = ({ onClose, sport }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<{
    summary?: string;
    keyTakeaways?: string[];
    topPicksExtracted?: Array<{ player: string; team?: string; position?: string; salary?: string; reason?: string }>;
    copyableCleanText?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const sampleTemplates = [
    {
      title: 'NBA Injury & Value Wire',
      sample: `Luka Doncic (calf) RULED OUT tonight vs Rockets. Kyrie Irving will see massive usage boost (+6.2%).
Jaden Hardy ($3,800 DK) projected to start at shooting guard.
Spurs vs Pacers total bumped to 238.5. Victor Wembanyama facing bottom-3 paint defense.
Value play: TJ McConnell $4,400 DK, projected 29 minutes against Hawks fast tempo.`,
    },
    {
      title: 'NFL Red Zone & Defense Mismatch',
      sample: `Bills vs Chiefs: Josh Allen total 48.5, BUF -2.
Chiefs defense allows 72 YPG to tight ends (rank 31st). Dawson Knox $3,400 DK punt play.
Lions @ Texans: Highest game total 51.5. Jameson Williams $5,300 DK against backup safety.
Audric Estime $4,500 DK taking over Broncos goal-line work.`,
    },
  ];

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch {
      // Browser permissions may require manual paste
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/dfs/analyze-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: inputText, sport }),
      });
      const data = await res.json();
      setAnalyzedResult(data);
      soundManager.playLockAlert();
    } catch (err) {
      console.error(err);
      // Fallback
      setAnalyzedResult({
        summary: 'Raw text formatted for screen copy',
        keyTakeaways: ['Direct plain text preserved for copy/paste'],
        topPicksExtracted: [],
        copyableCleanText: inputText.trim(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCleanText = (text: string) => {
    navigator.clipboard.writeText(text);
    soundManager.playCopyTone();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Put Text On Screen / Paste Slate
              </h3>
              <p className="text-xs text-slate-400">
                Paste any DFS salary list, notes, or Reddit snippet to format and copy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Sample quick buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" />
              Samples:
            </span>
            {sampleTemplates.map((t, i) => (
              <button
                key={i}
                onClick={() => setInputText(t.sample)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw DFS text, DraftKings/FanDuel salaries, injuries, or Reddit discussions here..."
              rows={5}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <button
              onClick={handlePasteFromClipboard}
              className="absolute right-2 bottom-3 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Paste Clipboard</span>
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 justify-between">
            <button
              onClick={() => handleCopyCleanText(inputText)}
              disabled={!inputText.trim()}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Put Directly On Screen & Copy</span>
            </button>

            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || isAnalyzing}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing DFS Text...' : 'Analyze & Extract Values'}</span>
            </button>
          </div>

          {/* Analysis Result Box */}
          {analyzedResult && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400">
                  ⚡ Screen Ready Formatted Text:
                </span>
                <button
                  onClick={() =>
                    handleCopyCleanText(
                      analyzedResult.copyableCleanText || inputText
                    )
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Formatted Text</span>
                    </>
                  )}
                </button>
              </div>

              {analyzedResult.summary && (
                <p className="text-xs text-slate-300 font-medium">
                  {analyzedResult.summary}
                </p>
              )}

              {/* Key takeaways */}
              {analyzedResult.keyTakeaways && analyzedResult.keyTakeaways.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Key DFS Takeaways:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {analyzedResult.keyTakeaways.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Picks */}
              {analyzedResult.topPicksExtracted && analyzedResult.topPicksExtracted.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Extracted Top Value Plays:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analyzedResult.topPicksExtracted.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{p.player}</span>
                          {p.position && (
                            <span className="px-1 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 font-mono">
                              {p.position}
                            </span>
                          )}
                        </div>
                        {p.reason && (
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                            {p.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Copyable text block */}
              {analyzedResult.copyableCleanText && (
                <pre className="p-3 rounded-lg bg-slate-900 font-mono text-xs text-emerald-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto border border-slate-800">
                  {analyzedResult.copyableCleanText}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
