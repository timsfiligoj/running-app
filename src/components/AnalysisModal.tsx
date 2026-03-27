import { useState, useEffect, useRef } from 'react';
import { analyzeRun, type WorkoutContext, type AnalysisResult } from '../lib/analysis';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  stravaUrl?: string;
  date?: string;
  workoutContext: WorkoutContext;
  workoutKey?: string;
}

// Extract CONFIDENCE: XX% from analysis text
function extractConfidence(text: string): number | null {
  const match = text.match(/CONFIDENCE:\s*(\d+)\s*%/i);
  return match ? parseInt(match[1]) : null;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return 'text-green-600';
  if (confidence >= 50) return 'text-yellow-600';
  return 'text-red-500';
}

function getConfidenceBarColor(confidence: number): string {
  if (confidence >= 75) return 'bg-green-500';
  if (confidence >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 85) return 'Odlicno na poti';
  if (confidence >= 70) return 'Dobra smer';
  if (confidence >= 50) return 'Potrebno delo';
  return 'Izziv';
}

export function AnalysisModal({ isOpen, onClose, stravaUrl, date, workoutContext, workoutKey }: AnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !result && !loading) {
      runAnalysis(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const runAnalysis = async (forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    setIsCached(false);
    const { data, error: err, cached } = await analyzeRun(stravaUrl, date, workoutContext, workoutKey, forceRefresh);
    if (err) {
      setError(err);
    } else {
      setResult(data);
      setIsCached(cached);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    setLoading(false);
    setIsCached(false);
    onClose();
  };

  if (!isOpen) return null;

  const confidence = result ? extractConfidence(result.analysis) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Analiza teka</h2>
              {result?.sources && (
                <div className="flex gap-2 mt-0.5">
                  {result.sources.strava && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                      </svg>
                      Strava
                    </span>
                  )}
                  {result.sources.garmin && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      Garmin
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/80 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Confidence bar - shown at top when available */}
        {confidence !== null && !loading && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Predikcija cilja</span>
              <span className={`text-lg font-bold ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getConfidenceBarColor(confidence)}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className={`text-xs mt-1 font-medium ${getConfidenceColor(confidence)}`}>
              {getConfidenceLabel(confidence)}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Analiziram tek...</p>
              <p className="mt-1 text-sm text-gray-400">Zbiram podatke iz Strave in Garmina</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-2">Napaka pri analizi</p>
              <p className="text-sm text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => { runAnalysis(false); }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Poskusi znova
              </button>
            </div>
          )}

          {result && !loading && (
            <MarkdownRenderer content={result.analysis} />
          )}
        </div>

        {/* Footer */}
        {result && !loading && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCached && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Shranjena analiza
                </span>
              )}
              <button
                onClick={() => { runAnalysis(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Nova analiza
              </button>
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Zapri
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  // Remove the CONFIDENCE: XX% line from rendered content (it's shown in the bar)
  const cleanedContent = content.replace(/CONFIDENCE:\s*\d+\s*%/gi, '').trim();

  const lines = cleanedContent.split('\n');
  const elements: React.ReactElement[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1.5 my-3">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="text-violet-400 mt-1 flex-shrink-0">&#8226;</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <div key={key++} className="mt-5 mb-2 first:mt-0">
          <h3
            className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-1.5"
            dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(4)) }}
          />
        </div>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-base font-bold text-gray-900 mt-6 mb-2 first:mt-0"
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.slice(3)) }}
        />
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={key++} className="text-sm text-gray-700 leading-relaxed my-2"
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
        />
      );
    }
  }
  flushList();

  return <div className="space-y-0">{elements}</div>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-gray-600">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
}
