import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/client';
import ProfileModal from '../components/ProfileModal';

/* ─── language options ─────────────────────────────────────── */
const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'Go', 'Rust'];

const TEMPLATES = {
    JavaScript: `// HintHive — JavaScript Playground\nfunction fibonacci(n) {\n  if (n <= 1) return n\n  return fibonacci(n - 1) + fibonacci(n - 2)\n}\n\nconsole.log(fibonacci(10))\n`,
    Python: `# HintHive — Python Playground\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nprint(fibonacci(10))\n`,
    TypeScript: `// HintHive — TypeScript Playground\nfunction greet(name: string): void {\n  console.log(\`Hello, \${name}\`)\n}\n\ngreet("World")\n`,
    Java: `// HintHive — Java Playground\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
    'C++': `// HintHive — C++ Playground\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
    Go: `// HintHive — Go Playground\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
    Rust: `// HintHive — Rust Playground\nfn main() {\n    println!("Hello, World!");\n}\n`,
};

function HintCard({ hint, index, isDark }) {
    const [open, setOpen] = useState(true);

    // Glassmorphic badges
    const sevStyles = {
        error: isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-500/10 text-red-600 border-red-500/20',
        warning: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        info: isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        success: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    };

    const cardBase = isDark
        ? 'bg-white/5 border-white/10 hover:bg-white/10'
        : 'bg-white/40 border-white/40 hover:bg-white/60';

    const s = sevStyles[hint.severity] || sevStyles.info;

    return (
        <div
            className={`rounded-2xl border backdrop-blur-md transition-all duration-300 ${cardBase} overflow-hidden animate-fadeIn`}
            style={{ animationDelay: `${index * 55}ms` }}
        >
            <button
                className="w-full flex items-start gap-4 p-4 text-left transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <div className="text-2xl shrink-0 mt-0.5 drop-shadow-md">{hint.icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{hint.title}</span>
                        {hint.line && (
                            <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${isDark ? 'text-slate-300 bg-black/40 border-white/10' : 'text-slate-600 bg-white/50 border-white/50'}`}>
                                Line {hint.line}
                            </span>
                        )}
                        <span className={`text-xs px-3 py-1 rounded-full font-bold border ml-auto capitalize shadow-sm ${s}`}>
                            {hint.severity}
                        </span>
                    </div>
                </div>
                <svg className={`w-5 h-5 shrink-0 mt-1 transition-transform duration-300 ${isDark ? 'text-slate-400' : 'text-slate-500'} ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="px-4 pb-4 px-12 space-y-3">
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{hint.message}</p>
                    {hint.fix && (
                        <div className={`rounded-xl p-4 border mt-3 ${isDark ? 'bg-black/50 border-white/5' : 'bg-white/60 border-white/50'}`}>
                            <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Teacher's Prompt</div>
                            <pre className={`text-sm leading-relaxed whitespace-pre-wrap font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{hint.fix}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function CodeEditor({ code, onChange, language, isDark }) {
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

    const highlightCode = (code, language) => {
        const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const jsKw = /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|new|typeof|instanceof|async|await|try|catch|throw|break|continue|switch|case|null|undefined|true|false|this|super|of|in|from)\b/g;
        const pyKw = /\b(def|return|if|elif|else|for|while|class|import|from|as|with|try|except|finally|raise|pass|break|continue|in|not|and|or|is|None|True|False|lambda|yield|async|await|print|self)\b/g;
        const strings = /(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g;
        const comments = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g;
        const numbers = /\b(\d+\.?\d*)\b/g;

        let h = esc;
        const kwColor = isDark ? '#c084fc' : '#9333ea';
        const strColor = isDark ? '#86efac' : '#16a34a';
        const numColor = isDark ? '#fb923c' : '#ea580c';
        const commentColor = isDark ? '#64748b' : '#94a3b8';

        h = h.replace(comments, `<span style="color:${commentColor};font-style:italic">$1</span>`);
        h = h.replace(strings, `<span style="color:${strColor}">$1</span>`);
        h = h.replace(numbers, `<span style="color:${numColor}">$1</span>`);
        if (['JavaScript', 'TypeScript'].includes(language)) h = h.replace(jsKw, `<span style="color:${kwColor}">$1</span>`);
        else if (language === 'Python') h = h.replace(pyKw, `<span style="color:${kwColor}">$1</span>`);
        return h;
    };

    return (
        <div className="relative flex h-full overflow-hidden font-mono text-base">
            <div ref={lineRef}
                className={`select-none shrink-0 px-4 py-6 text-right text-sm leading-relaxed overflow-hidden border-r pointer-events-none ${isDark ? 'text-slate-500 border-white/10 bg-black/20' : 'text-slate-400 border-indigo-900/10 bg-white/30'}`}
                style={{ minWidth: '3.5rem' }}>
                {code.split('\n').map((_, i) => <div key={i} className="leading-relaxed">{i + 1}</div>)}
            </div>

            <textarea ref={taRef} value={code}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown} onScroll={syncScroll}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                className="flex-1 resize-none bg-transparent text-transparent caret-indigo-500 px-6 py-6 focus:outline-none leading-relaxed z-10 relative overflow-auto"
            />

            <div ref={overlayRef} aria-hidden
                className={`absolute left-[3.5rem] top-0 right-0 bottom-0 px-6 py-6 leading-relaxed whitespace-pre overflow-hidden pointer-events-none ${isDark ? 'text-slate-300' : 'text-slate-800'}`}
                dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
            />
        </div>
    );
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isDark, setIsDark] = useState(true);
    const [language, setLanguage] = useState('Python');
    const [code, setCode] = useState(TEMPLATES['Python']);
    const [profileOpen, setProfileOpen] = useState(false);

    const [hints, setHints] = useState([]);
    const [summary, setSummary] = useState('');
    const [analysing, setAnalysing] = useState(false);
    const [analyseErr, setAnalyseErr] = useState('');
    const [lastAnalysed, setLastAnalysed] = useState(null);
    const debounceRef = useRef(null);

    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: "👋 Hi! I'm HintHive. Write some code on the left and I'll check it mathematically. If there's a bug, I'll teach you how to fix it with Socratic questions." }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

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
            const msg = err.response?.data?.detail || 'Analysis failed.';
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

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(TEMPLATES[lang] || '');
    };

    const handleLogout = async () => { await logout(); navigate('/'); };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = chatInput.trim();
        setChatInput('');

        const updatedHistory = [...chatHistory, { role: 'user', content: userMsg }];
        setChatHistory(updatedHistory);
        setChatLoading(true);

        try {
            const { data } = await aiApi.chat(code, language, updatedHistory.map(m => ({ role: m.role, content: m.content })));
            setChatHistory(h => [...h, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            setChatHistory(h => [...h, { role: 'assistant', content: `⚠️ Chat failed.` }]);
        } finally {
            setChatLoading(false);
        }
    };

    const errorCount = hints.filter(h => h.severity === 'error').length;
    const warningCount = hints.filter(h => h.severity === 'warning').length;

    // Theme Classes
    const th = {
        bg: isDark ? 'bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-purple-900/30 to-slate-950' : 'bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-fuchsia-100 to-sky-100',
        text: isDark ? 'text-white' : 'text-slate-800',
        glass: isDark ? 'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl' : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-xl shadow-indigo-500/10',
        glassInput: isDark ? 'bg-black/40 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/50' : 'bg-white/50 border-white/60 text-slate-800 placeholder-slate-500 focus:border-indigo-400',
        glassBtn: isDark ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' : 'bg-white/50 hover:bg-white/80 border-white/60 text-slate-700 font-medium',
        header: isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-white/40'
    };

    return (
        <div className={`h-screen ${th.bg} ${th.text} flex flex-col overflow-hidden transition-colors duration-500`}>
            {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

            {/* ── Navbar ── */}
            <header className={`shrink-0 h-16 flex items-center justify-between px-6 border-b backdrop-blur-3xl z-30 transition-colors duration-500 ${th.header}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30 text-white">H</div>
                    <span className="font-extrabold text-xl tracking-tight">Hint<span className={isDark ? "text-indigo-400" : "text-indigo-600"}>Hive</span></span>
                    <span className={`hidden sm:block text-sm font-semibold px-3 py-1 rounded-full border ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white/50 border-white/60 text-slate-600'}`}>Verification Engine</span>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setIsDark(!isDark)}
                        className={`p-2.5 rounded-xl border transition-all ${th.glassBtn}`}
                        title="Toggle Theme">
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <button
                        onClick={() => setProfileOpen(true)}
                        title="Edit profile"
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${th.glassBtn}`}
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm hidden sm:block">{user?.username}</span>
                    </button>
                    <button onClick={handleLogout}
                        className={`text-sm px-4 py-2 rounded-xl transition-all border ${isDark ? 'border-red-500/30 hover:bg-red-500/20 text-red-300' : 'border-red-500/40 hover:bg-red-500/10 text-red-600 bg-white/40'}`}>
                        Logout
                    </button>
                </div>
            </header>

            {/* ── Main Layout ── */}
            <div className="flex-1 flex gap-6 p-6 overflow-hidden max-w-[1800px] mx-auto w-full">

                {/* Left: Code Editor pane */}
                <div className={`flex flex-col w-1/2 rounded-3xl overflow-hidden ${th.glass}`}>
                    <div className={`shrink-0 flex items-center gap-4 px-6 py-4 border-b ${th.header}`}>
                        <div className="relative">
                            <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                                className={`appearance-none text-sm font-bold rounded-xl px-4 py-2 pr-10 focus:outline-none cursor-pointer border ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/60 border-indigo-200 text-indigo-900'}`}>
                                {LANGUAGES.map(l => <option key={l} value={l} className={isDark ? 'bg-slate-900' : 'bg-white'}>{l}</option>)}
                            </select>
                            <svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-400' : 'text-indigo-600'}`}
                                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        <div className="ml-auto flex items-center gap-3">
                            <button onClick={() => runAnalyze(code, language)} disabled={analysing}
                                className={`flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-xl border transition-all ${isDark ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border-indigo-500/40' : 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-lg shadow-indigo-500/30'} disabled:opacity-50`}>
                                {analysing
                                    ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Synthesizing…</>
                                    : <><span>⚡</span>Verify Logic</>}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <CodeEditor code={code} onChange={setCode} language={language} isDark={isDark} />
                    </div>
                </div>

                {/* Right: AI Panel */}
                <div className="flex flex-col w-1/2 gap-6 overflow-hidden relative">
                    {/* Hints Box */}
                    <div className={`flex flex-col flex-1 rounded-3xl overflow-hidden ${th.glass}`}>
                        <div className={`shrink-0 flex items-center gap-3 px-6 py-4 border-b ${th.header}`}>
                            <span className="text-lg font-bold">🧠 Verification Results</span>
                            <div className="flex gap-2 ml-4">
                                {errorCount > 0 && <span className={`text-xs px-3 py-1 rounded-full font-bold border ${isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200'}`}>{errorCount} Bugs</span>}
                                {!analysing && hints.length > 0 && errorCount === 0 && warningCount === 0 && (
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>✓ Mathematically Verified</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {analysing && hints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className={`w-3 h-3 rounded-full animate-bounce ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`} style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                    <span className={`font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Evaluating state space logic…</span>
                                </div>
                            ) : hints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="text-6xl mb-4 opacity-50">✨</div>
                                    <h3 className="text-xl font-bold mb-2">Write Code to Begin</h3>
                                    <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Your code will be mathematically evaluated for runtime errors without AI guessing.</p>
                                </div>
                            ) : (
                                hints.map((hint, i) => <HintCard key={hint.id || i} hint={hint} index={i} isDark={isDark} />)
                            )}
                        </div>
                    </div>

                    {/* Chat Widget Floating Panel */}
                    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
                        {/* Chat Box */}
                        {chatOpen && (
                            <div className={`mb-4 w-[420px] h-[550px] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all border border-white/20 origin-bottom-right ${isDark ? 'bg-slate-900/90 backdrop-blur-2xl' : 'bg-white/90 backdrop-blur-2xl'}`}>
                                <div className={`shrink-0 px-6 py-4 border-b flex items-center justify-between ${th.header}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center text-white text-sm shadow-md">🤖</div>
                                        <span className="text-lg font-bold">Socratic Tutor</span>
                                    </div>
                                    <button onClick={() => setChatOpen(false)} className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${th.glassBtn}`}>
                                        ✕
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs shrink-0 mt-1 shadow-md font-bold">H</div>
                                            )}
                                            <div className={`max-w-[85%] text-sm px-5 py-3.5 rounded-2xl leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-indigo-600 border border-indigo-500 text-white rounded-br-sm'
                                                : isDark ? 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm' : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-sm'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex gap-3 justify-start">
                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs shrink-0 shadow-md font-bold">H</div>
                                            <div className={`rounded-2xl rounded-bl-sm px-5 py-4 flex gap-2 items-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                                {[0, 1, 2].map(i => (
                                                    <div key={i} className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-400' : 'bg-indigo-600'}`} style={{ animationDelay: `${i * 150}ms` }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleChatSubmit} className={`shrink-0 flex gap-3 px-6 py-4 border-t ${th.header}`}>
                                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={chatLoading}
                                        placeholder="Ask your tutor..."
                                        className={`flex-1 rounded-xl px-4 py-3 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium ${th.glassInput}`}
                                    />
                                    <button type="submit" disabled={!chatInput.trim() || chatLoading}
                                        className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95">
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Floating Action Button */}
                        <button
                            onClick={() => setChatOpen(!chatOpen)}
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl transition-transform duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-slate-800 text-white border border-white/20' : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white hover:shadow-indigo-500/50'}`}
                            title="Socratic AI Tutor"
                        >
                            {chatOpen ? '✕' : '💬'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
