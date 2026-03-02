import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/client';
import ProfileModal from '../components/ProfileModal';

/* ─── language options ─────────────────────────────────────── */
const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'Go', 'Rust'];

const TEMPLATES = {
    JavaScript: `// HintHive — JavaScript Playground
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10))
`,
    Python: `# HintHive — Python Playground
def fibonacci(n):
    if n <= 1:
        return n
return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
`,
    TypeScript: `// HintHive — TypeScript Playground
function greet(name: string): void {
  console.log(\`Hello, \${name}\`)
}

greet("World")
`,
    Java: `// HintHive — Java Playground
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!")
    }
}
`,
    'C++': `// HintHive — C++ Playground
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl
    return 0;
}
`,
    Go: `// HintHive — Go Playground
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
    Rust: `// HintHive — Rust Playground
fn main() {
    println!("Hello, World!")
}
`,
};

/* ─── severity colours ─────────────────────────────────────── */
const SEV = {
    error: { badge: 'bg-red-500/20 text-red-400 border border-red-500/30', card: 'border-red-500/20 bg-red-500/5' },
    warning: { badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', card: 'border-amber-500/20 bg-amber-500/5' },
    info: { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', card: 'border-blue-500/20 bg-blue-500/5' },
    success: { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', card: 'border-emerald-500/20 bg-emerald-500/5' },
};

/* ════════════════════════════════════════════════════════════
   HINT CARD
════════════════════════════════════════════════════════════ */
function HintCard({ hint, index }) {
    const [open, setOpen] = useState(true);
    const s = SEV[hint.severity] || SEV.info;

    return (
        <div
            className={`rounded-xl border ${s.card} overflow-hidden animate-fadeIn`}
            style={{ animationDelay: `${index * 55}ms` }}
        >
            <button
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <span className="text-lg shrink-0 mt-0.5">{hint.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{hint.title}</span>
                        {hint.line && (
                            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                                Line {hint.line}
                            </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto capitalize ${s.badge}`}>
                            {hint.severity}
                        </span>
                    </div>
                </div>
                <svg className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3">
                    <p className="text-slate-300 text-xs leading-relaxed">{hint.message}</p>
                    {hint.fix && (
                        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                            <div className="text-xs text-slate-500 font-medium mb-1.5">💊 Suggested Fix</div>
                            <pre className="text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap font-mono">{hint.fix}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   CODE EDITOR — styled textarea with highlight overlay
════════════════════════════════════════════════════════════ */
function highlightCode(code, language) {
    const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const jsKw = /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|new|typeof|instanceof|async|await|try|catch|throw|break|continue|switch|case|null|undefined|true|false|this|super|of|in|from)\b/g;
    const pyKw = /\b(def|return|if|elif|else|for|while|class|import|from|as|with|try|except|finally|raise|pass|break|continue|in|not|and|or|is|None|True|False|lambda|yield|async|await|print|self)\b/g;
    const strings = /(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g;
    const comments = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g;
    const numbers = /\b(\d+\.?\d*)\b/g;
    let h = esc;
    h = h.replace(comments, '<span style="color:#6b7280;font-style:italic">$1</span>');
    h = h.replace(strings, '<span style="color:#86efac">$1</span>');
    h = h.replace(numbers, '<span style="color:#fb923c">$1</span>');
    if (['JavaScript', 'TypeScript'].includes(language)) h = h.replace(jsKw, '<span style="color:#c084fc">$1</span>');
    else if (language === 'Python') h = h.replace(pyKw, '<span style="color:#c084fc">$1</span>');
    return h;
}

function CodeEditor({ code, onChange, language }) {
    const taRef = useRef(null);
    const overlayRef = useRef(null);
    const lineRef = useRef(null);

    const syncScroll = () => {
        if (overlayRef.current && taRef.current) {
            overlayRef.current.scrollTop = taRef.current.scrollTop;
            overlayRef.current.scrollLeft = taRef.current.scrollLeft;
        }
        if (lineRef.current && taRef.current) lineRef.current.scrollTop = taRef.current.scrollTop;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = taRef.current, s = ta.selectionStart, end = ta.selectionEnd;
            const nv = code.slice(0, s) + '  ' + code.slice(end);
            onChange(nv);
            requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
        }
    };

    return (
        <div className="relative flex h-full bg-[#0a0a15] rounded-xl overflow-hidden font-mono text-sm">
            {/* line numbers */}
            <div ref={lineRef}
                className="select-none shrink-0 px-3 py-4 text-right text-slate-600 text-xs leading-6 overflow-hidden border-r border-white/5 pointer-events-none"
                style={{ minWidth: '3rem' }}>
                {code.split('\n').map((_, i) => <div key={i} className="leading-6">{i + 1}</div>)}
            </div>

            {/* textarea */}
            <textarea ref={taRef} value={code}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown} onScroll={syncScroll}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                className="flex-1 resize-none bg-transparent text-transparent caret-violet-400 px-4 py-4 focus:outline-none leading-6 z-10 relative overflow-auto"
                style={{ caretColor: '#a78bfa' }}
            />

            {/* highlight overlay */}
            <div ref={overlayRef} aria-hidden
                className="absolute left-12 top-0 right-0 bottom-0 px-4 py-4 leading-6 text-slate-300 whitespace-pre overflow-hidden pointer-events-none"
                dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
            />
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD PAGE
════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [language, setLanguage] = useState('JavaScript');
    const [code, setCode] = useState(TEMPLATES['JavaScript']);
    const [profileOpen, setProfileOpen] = useState(false);

    // AI analysis
    const [hints, setHints] = useState([]);
    const [summary, setSummary] = useState('');
    const [analysing, setAnalysing] = useState(false);
    const [analyseErr, setAnalyseErr] = useState('');
    const [lastAnalysed, setLastAnalysed] = useState(null);
    const debounceRef = useRef(null);

    // Chat
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: '👋 Hi! I\'m HintHive AI powered by Groq. Write some code on the left and I\'ll analyse it. You can also ask me anything about your code here!' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    /* scroll chat to bottom on new message */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

    /* ── auto-analyse 1s after user stops typing ── */
    const runAnalyze = useCallback(async (currentCode, currentLang) => {
        if (!currentCode.trim()) { setHints([]); setSummary(''); return; }
        setAnalysing(true);
        setAnalyseErr('');
        try {
            const { data } = await aiApi.analyze(currentCode, currentLang);
            setHints(data.hints || []);
            setSummary(data.summary || '');
            setLastAnalysed(new Date().toLocaleTimeString());
        } catch (err) {
            const msg = err.response?.data?.detail || 'Analysis failed. Check your Groq API key.';
            setAnalyseErr(msg);
            setHints([]);
        } finally {
            setAnalysing(false);
        }
    }, []);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runAnalyze(code, language), 1200);
        return () => clearTimeout(debounceRef.current);
    }, [code, language, runAnalyze]);

    /* language switch */
    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(TEMPLATES[lang] || '');
    };

    /* logout */
    const handleLogout = async () => { await logout(); navigate('/'); };

    /* ── chat submit ── */
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = chatInput.trim();
        setChatInput('');

        const userEntry = { role: 'user', content: userMsg };
        const updatedHistory = [...chatHistory, userEntry];
        setChatHistory(updatedHistory);
        setChatLoading(true);

        try {
            // send only user/assistant messages (skip the initial greeting if it has no role issue)
            const messagesForApi = updatedHistory.map(m => ({ role: m.role, content: m.content }));
            const { data } = await aiApi.chat(code, language, messagesForApi);
            setChatHistory(h => [...h, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            const msg = err.response?.data?.detail || 'AI chat failed. Check your Groq API key.';
            setChatHistory(h => [...h, { role: 'assistant', content: `⚠️ ${msg}` }]);
        } finally {
            setChatLoading(false);
        }
    };

    /* badge counts */
    const errorCount = hints.filter(h => h.severity === 'error').length;
    const warningCount = hints.filter(h => h.severity === 'warning').length;
    const ext = { JavaScript: 'js', Python: 'py', TypeScript: 'ts', Java: 'java', 'C++': 'cpp', Go: 'go', Rust: 'rs' };

    return (
        <div className="h-screen bg-[#07070f] text-white flex flex-col overflow-hidden">

            {/* Profile Modal */}
            {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

            {/* ── Top bar ── */}
            <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/10 bg-[#0a0a18]/80 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs shadow-lg shadow-violet-500/30">H</div>
                    <span className="font-bold text-base">Hint<span className="text-violet-400">Hive</span></span>
                    <span className="hidden sm:block text-slate-600 text-xs font-mono ml-1">/ dashboard</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Groq · {LANGUAGES.find(l => l === language) || language}
                    </div>
                    {/* clickable user chip */}
                    <button
                        onClick={() => setProfileOpen(true)}
                        title="Edit profile"
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-1.5 border border-white/10 hover:border-violet-500/40 transition-all group"
                    >
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-xs font-bold">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-slate-300 hidden sm:block group-hover:text-white transition-colors">{user?.username}</span>
                        <svg className="w-3 h-3 text-slate-600 group-hover:text-violet-400 transition-colors hidden sm:block"
                            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button onClick={handleLogout}
                        className="text-xs border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 text-slate-400 px-3 py-1.5 rounded-xl transition-all">
                        Logout
                    </button>
                </div>
            </header>

            {/* ── 2-column body ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ════ LEFT — Editor ════ */}
                <div className="flex flex-col w-1/2 border-r border-white/10 overflow-hidden">

                    {/* toolbar */}
                    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-[#0d0d1a] border-b border-white/10">
                        {/* language picker */}
                        <div className="relative">
                            <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 text-white text-xs font-medium rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-violet-500/50 cursor-pointer">
                                {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#0d0d1a]">{l}</option>)}
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
                                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            main.{ext[language] || 'txt'}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            {/* manual analyse */}
                            <button onClick={() => runAnalyze(code, language)}
                                disabled={analysing}
                                className="flex items-center gap-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                                {analysing
                                    ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Analysing…</>
                                    : <><span>⚡</span>Analyse</>}
                            </button>
                            <button onClick={() => setCode('')}
                                className="text-xs text-slate-500 hover:text-slate-300 border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all">
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* editor */}
                    <div className="flex-1 overflow-hidden p-4">
                        <CodeEditor code={code} onChange={setCode} language={language} />
                    </div>

                    {/* status bar */}
                    <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-[#08080f] border-t border-white/5 text-xs text-slate-600">
                        <span className="font-mono">{language}</span>
                        <span>{code.split('\n').length} lines · {code.length} chars</span>
                        {lastAnalysed && <span className="ml-auto">Analysed {lastAnalysed}</span>}
                    </div>
                </div>

                {/* ════ RIGHT — AI Panel ════ */}
                <div className="flex flex-col w-1/2 overflow-hidden">

                    {/* ── Hints (top 55%) ── */}
                    <div className="flex flex-col" style={{ height: '55%' }}>
                        {/* hints header */}
                        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#0d0d1a] border-b border-white/10">
                            <span className="text-sm font-semibold text-white">🔍 AI Code Analysis</span>
                            <div className="flex items-center gap-1.5 ml-2">
                                {errorCount > 0 && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
                                {warningCount > 0 && <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">{warningCount} warn</span>}
                                {!analysing && hints.length > 0 && errorCount === 0 && warningCount === 0 && (
                                    <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">✓ clean</span>
                                )}
                            </div>
                            {analysing && (
                                <div className="ml-auto flex items-center gap-1.5 text-xs text-violet-400">
                                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Groq thinking…
                                </div>
                            )}
                        </div>

                        {/* summary bar */}
                        {summary && !analysing && (
                            <div className="shrink-0 px-4 py-2 bg-violet-500/5 border-b border-violet-500/10 text-xs text-violet-300">
                                <span className="text-slate-500 mr-1">AI:</span>{summary}
                            </div>
                        )}

                        {/* error banner */}
                        {analyseErr && (
                            <div className="shrink-0 mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                                ⚠️ {analyseErr}
                            </div>
                        )}

                        {/* hints list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {analysing && hints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <div className="flex gap-1.5">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
                                                style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                    <span className="text-slate-600 text-xs">Groq is analysing your code…</span>
                                </div>
                            ) : hints.length === 0 && !analyseErr ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
                                    <span className="text-3xl">🎯</span>
                                    <span>Start writing code to get AI hints</span>
                                </div>
                            ) : (
                                hints.map((hint, i) => <HintCard key={hint.id || i} hint={hint} index={i} />)
                            )}
                        </div>
                    </div>

                    {/* ── Chat (bottom 45%) ── */}
                    <div className="flex flex-col border-t border-white/10" style={{ height: '45%' }}>
                        <div className="shrink-0 px-4 py-2.5 bg-[#0d0d1a] border-b border-white/10 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs">🤖</div>
                            <span className="text-sm font-semibold text-white">Groq AI Chat</span>
                            <span className="text-xs text-slate-600 ml-1">— context-aware</span>
                            <div className="ml-auto flex items-center gap-1 text-xs text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                llama-3.3-70b
                            </div>
                        </div>

                        {/* messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs shrink-0 mt-0.5">H</div>
                                    )}
                                    <div className={`max-w-[85%] text-xs px-3 py-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-violet-600/30 text-violet-100 border border-violet-500/30 rounded-br-sm'
                                        : 'bg-white/5 text-slate-300 border border-white/10 rounded-bl-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {/* typing indicator */}
                            {chatLoading && (
                                <div className="flex gap-2 justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs shrink-0">H</div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                                                style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* input */}
                        <form onSubmit={handleChatSubmit}
                            className="shrink-0 flex gap-2 px-4 py-3 bg-[#08080f] border-t border-white/5">
                            <input type="text" value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                disabled={chatLoading}
                                placeholder="Ask Groq AI about your code…"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600
                           focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all
                           disabled:opacity-50"
                            />
                            <button type="submit" disabled={!chatInput.trim() || chatLoading}
                                className="shrink-0 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500
                           text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95">
                                {chatLoading ? (
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                ) : 'Send'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
