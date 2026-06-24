import React, { useState, useEffect, useRef, useCallback } from 'react';
import VeronicaAvatar from './VeronicaAvatar';
import { askGemini, extractMood, cleanText, extractTasks } from './gemini';

const ACCENT = {
  focused:   '#6366F1',
  motivated: '#EC4899',
  calm:      '#14B8A6',
  urgent:    '#F97316',
};

const TIPS = [
  "Eat the frog: do your hardest task before 10 AM while willpower is peak.",
  "Time-block deep work. 90-min sprints beat scattered 15-min bursts every time.",
  "A 5-min evening review prevents tomorrow from ambushing you.",
  "Batch emails & messages in one window. Protect your deep work time.",
  "Say no to one thing today that doesn't move your needle.",
  "The 2-minute rule: if it takes less than 2 mins, do it now.",
];

const QUICK_PROMPTS = [
  "Prioritize my tasks for today",
  "I'm feeling overwhelmed, help me",
  "Break down my biggest task into steps",
  "What should I focus on right now?",
  "I keep procrastinating, what do I do?",
];

function TaskCard({ task, onToggle, onDelete, accent }) {
  const pc = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start',
      gap: 12, opacity: task.done ? 0.5 : 1, transition: 'all 0.25s',
      borderLeft: `3px solid ${pc[task.priority]}`,
    }}>
      <button onClick={() => onToggle(task.id)} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        border: `2px solid ${task.done ? accent : 'rgba(255,255,255,0.3)'}`,
        background: task.done ? accent : 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
      }}>
        {task.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', textDecoration: task.done ? 'line-through' : 'none', marginBottom: 4 }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            background: pc[task.priority] + '25', color: pc[task.priority], textTransform: 'uppercase',
          }}>{task.priority}</span>
          {task.deadline && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>⏰ {task.deadline}</span>}
          {task.aiGenerated && <span style={{ fontSize: 10, color: accent, opacity: 0.7 }}>✨ AI</span>}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)',
        fontSize: 18, padding: 0, lineHeight: 1, transition: 'color 0.2s',
      }} onMouseEnter={e => e.target.style.color = '#EF4444'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.25)'}>
        ×
      </button>
    </div>
  );
}

function ChatBubble({ msg, accent }) {
  const isAI = msg.role === 'assistant';
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: isAI ? 'flex-start' : 'flex-end', margin: '6px 0' }}>
      {isAI && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}, #8B5CF6)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'white',
        }}>V</div>
      )}
      <div style={{
        maxWidth: '76%', padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
        color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-wrap',
        background: isAI ? 'rgba(255,255,255,0.07)' : `${accent}22`,
        border: `0.5px solid ${isAI ? 'rgba(255,255,255,0.1)' : accent + '44'}`,
        borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
      }}>{msg.content}</div>
    </div>
  );
}

function WaveBar({ active, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 24 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 3, background: accent,
          height: active ? `${5 + Math.abs(Math.sin(i * 0.9 + Date.now() / 300)) * 16}px` : '3px',
          transition: 'height 0.1s ease',
          opacity: active ? 0.9 : 0.3,
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hey! I'm Veronica 👋\n\nI'm your AI productivity companion — here to help you crush deadlines, not just remember them. Tell me what's on your plate today, and let's build a plan that actually gets done. 🎯"
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mood, setMood] = useState('focused');
  const [activeTab, setActiveTab] = useState('chat');
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Review hackathon project plan', priority: 'high', deadline: 'Today', done: false, aiGenerated: false },
    { id: 2, title: 'Complete submission document', priority: 'high', deadline: 'Jun 29', done: false, aiGenerated: false },
    { id: 3, title: 'Push code to GitHub', priority: 'medium', deadline: 'Jun 28', done: false, aiGenerated: false },
  ]);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', deadline: '' });
  const [addingTask, setAddingTask] = useState(false);
  const [productivity, setProductivity] = useState(72);
  const [tipIdx] = useState(Math.floor(Date.now() / 3600000) % TIPS.length);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [waveAnim, setWaveAnim] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const accent = ACCENT[mood];
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;

  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (speaking) {
      const iv = setInterval(() => setWaveAnim(p => !p), 100);
      return () => clearInterval(iv);
    }
  }, [speaking]);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 300));
    utt.pitch = 1.18; utt.rate = 0.94; utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const fem = voices.find(v =>
      /samantha|victoria|karen|zira|google uk english female|female/i.test(v.name)
    );
    if (fem) utt.voice = fem;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      const raw = await askGemini(history);
      const detectedMood = extractMood(raw);
      const clean = cleanText(raw);
      const newTasks = extractTasks(raw);

      setMood(detectedMood);
      const aiMsg = { role: 'assistant', content: clean };
      setMessages(prev => [...prev, aiMsg]);
      speak(clean.replace(/→/g, '').slice(0, 280));

      if (newTasks.length > 0) {
        const taskObjs = newTasks.map((t, i) => ({
          id: Date.now() + i, title: t, priority: 'medium',
          deadline: '', done: false, aiGenerated: true,
        }));
        setTasks(prev => [...prev, ...taskObjs]);
        setProductivity(p => Math.min(100, p + 4));
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops! Couldn't connect to Gemini. Check your API key or network and try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, done: !t.done };
      setProductivity(p => Math.min(100, Math.max(0, next.done ? p + 9 : p - 9)));
      return next;
    }));
  };

  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const addTask = () => {
    if (!newTask.title.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), ...newTask, done: false, aiGenerated: false }]);
    setNewTask({ title: '', priority: 'medium', deadline: '' });
    setAddingTask(false);
  };

  const bg = `radial-gradient(ellipse at 15% 15%, ${accent}1A 0%, transparent 55%),
    radial-gradient(ellipse at 85% 85%, #8B5CF61A 0%, transparent 55%), #0F0F1A`;

  return (
    <div style={{ height: '100vh', background: bg, fontFamily: "'Inter', sans-serif", color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(24px)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}, #8B5CF6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 700, boxShadow: `0 0 16px ${accent}55`,
          }}>V</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.4px' }}>Veronica</div>
            <div style={{ fontSize: 11, color: accent, fontWeight: 500, letterSpacing: '0.5px' }}>
              {speaking ? '🎙️ Speaking...' : '✨ AI Productivity Companion'}
            </div>
          </div>
        </div>

        {/* Mood pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.keys(ACCENT).map(m => (
            <button key={m} onClick={() => setMood(m)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
              background: mood === m ? `${ACCENT[m]}30` : 'transparent',
              border: `0.5px solid ${mood === m ? ACCENT[m] : 'rgba(255,255,255,0.15)'}`,
              color: mood === m ? ACCENT[m] : 'rgba(255,255,255,0.4)',
              fontWeight: mood === m ? 600 : 400, transition: 'all 0.2s', textTransform: 'capitalize',
            }}>{m}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <WaveBar active={speaking} accent={accent} />
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.06)', padding: '5px 12px',
            borderRadius: 20, border: '0.5px solid rgba(255,255,255,0.1)',
          }}>🔥 {productivity}% productive</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Powered by <span style={{ color: '#4285F4', fontWeight: 600 }}>Gemini</span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT PANEL — Avatar */}
        <aside style={{
          width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '20px 14px', gap: 14,
          borderRight: '0.5px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.18)', overflowY: 'auto',
        }}>
          {/* Avatar */}
          <div style={{
            position: 'relative', padding: 8,
            background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
            borderRadius: '50%',
          }}>
            <VeronicaAvatar speaking={speaking} mood={mood} size={186} />
            <div style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 13, height: 13, borderRadius: '50%', background: '#22C55E',
              border: '2px solid #0F0F1A', boxShadow: '0 0 8px #22C55E88',
            }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.5px' }}>Veronica</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>Your AI Productivity AI</div>
          </div>

          {/* Stats */}
          {[
            { icon: '✅', label: 'Tasks today', value: `${done}/${total}` },
            { icon: '🧠', label: 'Focus mode', value: mood },
            { icon: '🔥', label: 'Streak', value: '3 days' },
            { icon: '⚡', label: 'Tasks by AI', value: tasks.filter(t => t.aiGenerated).length },
          ].map(s => (
            <div key={s.label} style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10,
              padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{s.icon} {s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: accent, textTransform: 'capitalize' }}>{s.value}</span>
            </div>
          ))}

          {/* Progress ring */}
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke={accent} strokeWidth="9"
              strokeDasharray={`${2*Math.PI*46}`}
              strokeDashoffset={`${2*Math.PI*46*(1-productivity/100)}`}
              strokeLinecap="round" transform="rotate(-90 55 55)"
              style={{ transition: 'stroke-dashoffset 0.7s ease' }}/>
            <text x="55" y="50" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">{productivity}%</text>
            <text x="55" y="68" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">Productivity</text>
          </svg>

          {/* Wake button */}
          <button onClick={() => speak("Hello! I'm Veronica. How can I help you be more productive today?")}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 12, cursor: 'pointer',
              border: `0.5px solid ${accent}55`, background: `${accent}18`,
              color: accent, fontSize: 13, fontWeight: 600,
            }}>🎙️ Wake Veronica</button>
        </aside>

        {/* CENTER — Chat / Tasks */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.15)', padding: '0 20px',
          }}>
            {[['chat', '💬 Chat'], ['tasks', '📋 Tasks']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '13px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab ? accent : 'rgba(255,255,255,0.38)',
                borderBottom: `2px solid ${activeTab === tab ? accent : 'transparent'}`,
                fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                transition: 'all 0.2s',
              }}>{label}</button>
            ))}
          </div>

          {/* CHAT */}
          {activeTab === 'chat' && <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column' }}>
              {messages.map((m, i) => <ChatBubble key={i} msg={m} accent={accent} />)}
              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '6px 0' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accent}, #8B5CF6)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 700,
                  }}>V</div>
                  <div style={{ display: 'flex', gap: 5, padding: '10px 14px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px 16px 16px 16px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: accent,
                        animation: `bounce 0.8s ${i*0.18}s infinite ease-in-out`,
                      }}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef}/>
            </div>

            {/* Quick prompts */}
            <div style={{
              padding: '8px 20px', display: 'flex', gap: 7, flexWrap: 'wrap',
              borderTop: '0.5px solid rgba(255,255,255,0.05)',
            }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', transition: 'all 0.15s',
                }}>{p}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{
              padding: '14px 20px', display: 'flex', gap: 10,
              borderTop: '0.5px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.22)',
            }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Tell Veronica what's on your mind…"
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 14,
                  background: 'rgba(255,255,255,0.06)', color: 'white', outline: 'none',
                  border: `0.5px solid ${input ? accent + '55' : 'rgba(255,255,255,0.1)'}`,
                  transition: 'border 0.2s',
                }}/>
              <button onClick={() => send()} disabled={loading || !input.trim()} style={{
                padding: '12px 22px', borderRadius: 12, border: 'none', fontSize: 14,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${accent}, #8B5CF6)`,
                color: 'white', transition: 'all 0.2s', whiteSpace: 'nowrap',
                boxShadow: loading ? 'none' : `0 4px 20px ${accent}44`,
              }}>{loading ? '...' : 'Send →'}</button>
            </div>
          </>}

          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Task Board</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{done} of {total} completed</div>
                </div>
                <button onClick={() => setAddingTask(true)} style={{
                  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `0.5px solid ${accent}`, background: `${accent}20`,
                  color: accent, fontSize: 13, fontWeight: 600,
                }}>+ Add task</button>
              </div>

              {/* Progress */}
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 5, marginBottom: 20 }}>
                <div style={{
                  background: `linear-gradient(90deg, ${accent}, #8B5CF6)`,
                  height: '100%', borderRadius: 4, width: `${total ? (done/total)*100 : 0}%`,
                  transition: 'width 0.5s ease',
                }}/>
              </div>

              {/* Add task form */}
              {addingTask && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${accent}44`,
                  borderRadius: 12, padding: 16, marginBottom: 14,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <input placeholder="Task title..." value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    autoFocus
                    style={{
                      padding: '9px 13px', borderRadius: 8, fontSize: 14,
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none',
                    }}/>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      border: '0.5px solid rgba(255,255,255,0.15)', background: '#1A1A2E', color: 'white', outline: 'none',
                    }}>
                      <option value="high">🔴 High priority</option>
                      <option value="medium">🟡 Medium priority</option>
                      <option value="low">🟢 Low priority</option>
                    </select>
                    <input placeholder="Deadline" value={newTask.deadline}
                      onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                        border: '0.5px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none',
                      }}/>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addTask} style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${accent}, #8B5CF6)`, color: 'white', fontWeight: 600, fontSize: 13,
                    }}>Add Task</button>
                    <button onClick={() => setAddingTask(false)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                      border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent',
                      color: 'rgba(255,255,255,0.5)', fontSize: 13,
                    }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Task list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
                    No tasks yet. Chat with Veronica to get started!
                  </div>
                )}
                {[...tasks].sort((a, b) => {
                  if (a.done !== b.done) return a.done ? 1 : -1;
                  return { high:0, medium:1, low:2 }[a.priority] - { high:0, medium:1, low:2 }[b.priority];
                }).map(t => (
                  <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} accent={accent}/>
                ))}
              </div>

              {tasks.length > 0 && (
                <button onClick={() => { setActiveTab('chat'); setInput('Analyze my tasks and tell me the optimal order to tackle them today'); }}
                  style={{
                    marginTop: 18, width: '100%', padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                    border: `0.5px solid ${accent}44`, background: `${accent}10`, color: accent, fontSize: 13, fontWeight: 600,
                  }}>✨ Ask Veronica to prioritize these →</button>
              )}
            </div>
          )}
        </main>

        {/* RIGHT PANEL — Insights */}
        <aside style={{
          width: 238, flexShrink: 0, padding: '18px 14px',
          borderLeft: '0.5px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.18)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Today's Insights
          </div>

          {/* Clock */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>CURRENT TIME</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: accent, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#F97316', fontWeight: 500 }}>
              ⏳ Deadline: Jun 29, 2:00 PM
            </div>
          </div>

          {/* Energy */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>ENERGY SCHEDULE</div>
            {[
              { time: '9–11 AM', label: 'Peak focus', val: 0.95, color: '#22C55E' },
              { time: '12–2 PM', label: 'Moderate',   val: 0.62, color: '#F59E0B' },
              { time: '3–5 PM', label: 'Second wind', val: 0.80, color: '#6366F1' },
              { time: '6–8 PM', label: 'Wind down',   val: 0.32, color: '#94A3B8' },
            ].map(e => (
              <div key={e.time} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{e.time}</span>
                  <span style={{ fontSize: 11, color: e.color, fontWeight: 500 }}>{e.label}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, height: 4 }}>
                  <div style={{ background: e.color, height: '100%', borderRadius: 3, width: `${e.val*100}%`, transition: 'width 1s' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div style={{ background: `${accent}12`, border: `0.5px solid ${accent}33`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 8 }}>💡 VERONICA'S TIP</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{TIPS[tipIdx]}</div>
          </div>

          {/* Week heatmap */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>WEEK ACTIVITY</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[['M',0.8],['T',0.5],['W',0.9],['T',0.65],['F',0.4],['S',0.2],['S',0.1]].map(([d,v],i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    height: 32, borderRadius: 5, marginBottom: 5,
                    background: `${accent}`, opacity: 0.15 + v * 0.75,
                    transition: 'opacity 0.5s',
                  }}/>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hackathon countdown */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.12))',
            border: '0.5px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 11, color: '#F97316', fontWeight: 600, marginBottom: 6 }}>🏆 HACKATHON</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Vibe2Ship deadline in<br/>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#F97316', letterSpacing: '-1px' }}>4 days</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Jun 29 · 2:00 PM sharp</div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28); }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
