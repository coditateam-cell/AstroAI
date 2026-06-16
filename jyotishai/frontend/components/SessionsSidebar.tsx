'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiGet } from '@/lib/api';

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

interface Assessment {
  session_summary: string;
  key_insights: string[];
  action_items: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  livekit_room: string;
  status: string;
  started_at: string;
  duration_secs: number;
  assessment: Assessment | null;
  messages: Message[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncate(text: string, max = 80): string {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionsSidebarProps {
  userId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionsSidebar({ userId }: SessionsSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    apiGet<{ sessions: Session[] }>(`/sessions/user/${userId}`)
      .then(({ sessions }) => setSessions(sessions))
      .catch((err: Error) => {
        console.error('SessionsSidebar fetch error:', err);
        setError('Failed to load sessions.');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  function openSession(session: Session) {
    setSelectedSession(session);
    setActiveTab('summary');
  }

  function closePanel() {
    setSelectedSession(null);
  }

  return (
    <aside className="relative flex flex-col w-72 h-screen bg-zinc-950 border-r border-white/5 overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-amber-400 tracking-wide">✦ Past Sessions</h2>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <p className="text-zinc-500 text-xs text-center mt-8">Loading sessions…</p>
        )}

        {!loading && error && (
          <p className="text-red-400 text-xs text-center mt-8">{error}</p>
        )}

        {!loading && !error && sessions.length === 0 && (
          <p className="text-zinc-500 text-xs text-center mt-8">No past sessions yet.</p>
        )}

        {!loading && !error && sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => openSession(session)}
            className="w-full text-left rounded-xl bg-zinc-900/60 border border-white/5 px-4 py-3 hover:border-amber-400/30 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-300 font-medium">
                {formatDate(session.started_at)}
              </span>
              <span className="text-xs text-zinc-500">
                {formatDuration(session.duration_secs)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {session.assessment?.session_summary
                ? truncate(session.assessment.session_summary)
                : 'Assessment pending…'}
            </p>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedSession && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={closePanel}
            />

            {/* Slide-in panel */}
            <motion.div
              key="detail-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-screen w-96 bg-zinc-950 border-l border-white/5 z-50 flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <p className="text-xs text-zinc-400">{formatDate(selectedSession.started_at)}</p>
                  <p className="text-xs text-zinc-500">{formatDuration(selectedSession.duration_secs)}</p>
                </div>
                <button
                  onClick={closePanel}
                  aria-label="Close detail panel"
                  className="text-zinc-500 hover:text-white transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                {(['summary', 'transcript'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-amber-400 border-b-2 border-amber-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'summary' ? 'AI Assessment' : 'Full Transcript'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'summary' && (
                    <motion.div
                      key="summary-tab"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                    >
                      {selectedSession.assessment ? (
                        <div className="space-y-5">
                          <div>
                            <h3 className="text-xs font-semibold text-amber-400 mb-2 tracking-wide">Summary</h3>
                            <p className="text-zinc-300 text-xs leading-relaxed">
                              {selectedSession.assessment.session_summary}
                            </p>
                          </div>

                          {selectedSession.assessment.key_insights.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-amber-400 mb-2 tracking-wide">Key Insights</h3>
                              <ul className="space-y-1.5">
                                {selectedSession.assessment.key_insights.map((insight, i) => (
                                  <li key={i} className="text-zinc-300 text-xs leading-relaxed flex gap-2">
                                    <span className="text-amber-400 mt-0.5">•</span>
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedSession.assessment.action_items.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-amber-400 mb-2 tracking-wide">Action Items</h3>
                              <ul className="space-y-1.5">
                                {selectedSession.assessment.action_items.map((item, i) => (
                                  <li key={i} className="text-zinc-300 text-xs leading-relaxed flex gap-2">
                                    <span className="text-amber-400 mt-0.5">→</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-xs text-center mt-8">
                          Assessment not yet available.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'transcript' && (
                    <motion.div
                      key="transcript-tab"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {selectedSession.messages.length === 0 ? (
                        <p className="text-zinc-500 text-xs text-center mt-8">
                          No transcript available.
                        </p>
                      ) : (
                        selectedSession.messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-amber-400/10 text-amber-100 rounded-br-sm'
                                  : 'bg-zinc-800/80 text-zinc-300 rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </aside>
  );
}
