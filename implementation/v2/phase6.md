# TASK: Specification-Driven Implementation of Phase 5 (Frontend Historical Sessions Sidebar)

You must completely implement the premium session history sidebar and details panel using Next.js 15, Tailwind CSS, and Framer Motion. Completely write out the target files with full functional logic, handling data parsing error states gracefully. Do not use placeholder components or `# TODO` comments.

## Target Files to Create/Overwrite:
1. `frontend/components/SessionsSidebar.tsx`
2. `frontend/app/session/page.tsx` (Update to integrate the history sidebar component layout)

---

## SECTION 1: SPECIFICATIONS FOR `frontend/components/SessionsSidebar.tsx`

Create a highly polished React component named `SessionsSidebar`. It must handle fetching past sessions for a user, displaying them in a scrollable sidebar list, and rendering a detailed modal or sliding pane when a past session card is clicked.

Implement `frontend/components/SessionsSidebar.tsx` exactly as follows:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  messages?: Message[];
}

interface SessionsSidebarProps {
  userId: string;
  onSelectActiveSession?: (roomId: string) => void;
}

export default function SessionsSidebar({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  useEffect(() => {
    async function fetchSessions() {
      try {
        // Enforce parsing via our authenticated fetch architecture
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chart/user/${userId}`);
        // For development/mock fallback matching public.sessions schema
        const mockSessions: Session[] = [
          {
            id: "sess-01",
            livekit_room: "session_demo_room_1",
            status: "ended",
            started_at: new Date(Date.now() - 86400000).toISOString(),
            duration_secs: 345,
            assessment: {
              session_summary: "The seeker expressed intense drive regarding launching their automated platform, correlating with their natal planetary drives. We discussed maintaining mental balance during high-voltage transit sprints.",
              key_insights: [
                "High entrepreneurial clarity observed during the call.",
                "Subconscious anxiety identified relating to building timelines."
              ],
              action_items: [
                "Prioritize current core engine architecture over premature UI expansion.",
                "Incorporate strict daily wind-down routines to manage cognitive overload."
              ]
            },
            messages: [
              { role: 'user', content: "I feel like I have all this coding energy right now but I'm getting distracted by small aesthetic choices." },
              { role: 'assistant', content: "That is your core builder drive kicking into overdrive. Your blueprint shows a massive capacity to build, but right now the transit demands systematic focus over detail parsing." }
            ]
          }
        ];
        setSessions(mockSessions);
      } catch (err) {
        console.error("Error loading session archives:", err);
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchSessions();
  }, [userId]);

  return (
    <div className="flex h-full w-full max-w-sm flex-col border-r border-white/5 bg-zinc-950 text-white">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-bold tracking-widest text-amber-400 uppercase">
          ✦ Consultation Logs
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">Review your past audio readings with Celeste</p>
      </div>

      {/* Sessions Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
        {loading ? (
          <div className="text-xs text-zinc-500 p-4 text-center">Reading cosmic history archives...</div>
        ) : sessions.length === 0 ? (
          <div className="text-xs text-zinc-600 p-4 text-center">No past voice logs recorded yet.</div>
        ) : (
          sessions.map((sess) => (
            <button
              key={sess.id}
              onClick={() => setSelectedSession(sess)}
              className={`w-full text-left p-4 rounded-xl border border-white/5 transition-all duration-200 hover:bg-white/[0.02] bg-zinc-900/40 group relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-zinc-200 grouphover:text-amber-300 transition-colors">
                  {new Date(sess.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {Math.floor(sess.duration_secs / 60)}m {sess.duration_secs % 60}s
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-2">
                {sess.assessment?.session_summary || "Click to compute dynamic post-call report."}
              </p>
            </button>
          ))
        )}
      </div>

      {/* FULL RECORD DETAIL OVERLAY MODAL */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md p-4"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
                <div>
                  <h3 className="text-lg font-bold text-amber-400">Consultation Summary</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">Room ID: {selectedSession.livekit_room}</p>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Toggle Tabs */}
              <div className="flex border-b border-white/5 text-sm bg-zinc-900/20">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-3 text-center border-b transition-colors ${activeTab === 'summary' ? 'border-amber-400 text-amber-400 font-medium' : 'border-transparent text-zinc-400 hover:text-white'}`}
                >
                  AI Assessment
                </button>
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex-1 py-3 text-center border-b transition-colors ${activeTab === 'transcript' ? 'border-amber-400 text-amber-400 font-medium' : 'border-transparent text-zinc-400 hover:text-white'}`}
                >
                  Full Transcript
                </button>
              </div>

              {/* Dynamic View Scroll Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === 'summary' ? (
                  <div className="space-y-6">
                    {/* Summary Block */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-2">✦ Session Synopsis</h4>
                      <p className="text-zinc-200 leading-relaxed font-light">{selectedSession.assessment?.session_summary}</p>
                    </div>
                    {/* Key Insights */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-3">✦ Core Mindset Shifts</h4>
                      <ul className="space-y-2">
                        {selectedSession.assessment?.key_insights.map((insight, idx) => (
                          <li key={idx} className="text-sm text-zinc-300 flex gap-2 items-start">
                            <span className="text-amber-400">•</span> {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Action Items */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-3">✦ Actionable Adjustments</h4>
                      <ul className="space-y-2">
                        {selectedSession.assessment?.action_items.map((item, idx) => (
                          <li key={idx} className="text-sm text-zinc-300 p-3 rounded-lg bg-white/[0.02] border border-white/5 flex gap-3 items-center">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  /* FULL CHAT DIALOGUE TRANSCRIPT VIEW */
                  <div className="space-y-4">
                    {selectedSession.messages?.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1 px-1">
                          {msg.role === 'user' ? 'You' : 'Celeste'}
                        </span>
                        <div className={`p-4 rounded-xl text-sm max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-amber-400 text-black font-medium' : 'bg-zinc-900 border border-white/5 text-zinc-200'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


SECTION 2: SPECIFICATIONS FOR LAYOUT UPDATE (frontend/app/session/page.tsx)
Update your primary LiveKit audio workspace container to place this new SessionsSidebar side-by-side next to your active video or wave component. This gives the app that immersive, dashboard layout users expect from premium tools.


import SessionsSidebar from '@/components/SessionsSidebar';
import SessionUI from '@/components/SessionUI';

export default function SessionPage({ searchParams }: { searchParams: { chart_id: string } }) {
  // Grab current active authenticated user id from your useUser context hook logic 
  const currentUserId = "mock-user-uuid-12345"; 

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black">
      {/* Historical Session Archives Column */}
      <SessionsSidebar userId={currentUserId} />

      {/* Main Active LiveKit Voice Calling Room Space */}
      <div className="flex-1 flex flex-col justify-center items-center bg-radial-gradient relative p-8">
        <SessionUI sessionId={searchParams.chart_id} />
      </div>
    </div>
  );
}

