import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── tiny animated code snippet for hero ─── */
const CODE_LINES = [
    { text: 'function fibonacci(n) {', indent: 0, color: 'text-violet-300' },
    { text: '  if (n <= 1) return n;', indent: 1, color: 'text-slate-300' },
    { text: '  return fibonacci(n - 1) + fibonacci(n - 2)', indent: 1, color: 'text-slate-300' },
    { text: '}', indent: 0, color: 'text-violet-300' },
    { text: '', indent: 0, color: '' },
    { text: 'console.log(fibonacci(10));', indent: 0, color: 'text-emerald-300' },
];

const HINT_MESSAGES = [
    { type: 'error', icon: '⚠', msg: 'Missing semicolon on line 3 — add ";" after the expression.' },
    { type: 'logic', icon: '💡', msg: 'Tip: this recursive approach has O(2ⁿ) time complexity. Consider memoisation.' },
    { type: 'fix', icon: '✅', msg: 'Auto-fix applied! Semicolon added. Your code looks good now.' },
];

/* ─── features data ─── */
const FEATURES = [
    {
        icon: '🔍',
        title: 'Syntax Error Detection',
        desc: 'Instantly spots missing brackets, semicolons, typos and every syntax mistake as you type.',
        gradient: 'from-violet-500/20 to-purple-600/10',
        border: 'border-violet-500/30',
    },
    {
        icon: '🧠',
        title: 'Logic Error Analysis',
        desc: 'Goes beyond syntax — analyses your algorithm\'s logic and flags off-by-one errors, infinite loops, and more.',
        gradient: 'from-cyan-500/20 to-blue-600/10',
        border: 'border-cyan-500/30',
    },
    {
        icon: '⚡',
        title: 'Instant Fixes',
        desc: 'One-click auto-fixes for common errors so you spend time building, not debugging.',
        gradient: 'from-emerald-500/20 to-teal-600/10',
        border: 'border-emerald-500/30',
    },
    {
        icon: '💬',
        title: 'AI-Powered Hints',
        desc: 'Conversational guidance that explains *why* something is wrong and *how* to fix it — not just what.',
        gradient: 'from-orange-500/20 to-amber-600/10',
        border: 'border-orange-500/30',
    },
    {
        icon: '🌐',
        title: 'Multi-Language Support',
        desc: 'Supports JavaScript, Python, C++, Java, TypeScript and more languages out of the box.',
        gradient: 'from-pink-500/20 to-rose-600/10',
        border: 'border-pink-500/30',
    },
    {
        icon: '📈',
        title: 'Learning Feedback Loop',
        desc: 'Tracks recurring mistakes and provides personalised tips to help you level up over time.',
        gradient: 'from-indigo-500/20 to-blue-600/10',
        border: 'border-indigo-500/30',
    },
];

/* ─── testimonials ─── */
const TESTIMONIALS = [
    { name: 'Priya S.', role: 'CS Student', text: 'HintHive caught a subtle off-by-one bug I spent 3 hours chasing. Game changer!', avatar: '👩‍💻' },
    { name: 'Marcus T.', role: 'Bootcamp Graduate', text: 'The logic hints are insane — it doesn\'t just say what\'s wrong, it actually teaches you.', avatar: '👨‍🎓' },
    { name: 'Aisha K.', role: 'Full-Stack Dev', text: 'I use HintHive for quick prototypes. The instant fix suggestions save me so much time.', avatar: '🧑‍💻' },
];

/* ─── stats ─── */
const STATS = [
    { value: '50K+', label: 'Errors Caught' },
    { value: '12+', label: 'Languages' },
    { value: '98%', label: 'Accuracy Rate' },
    { value: '3x', label: 'Faster Debugging' },
];

/* ════════════════════════════════════════════════
   Animated typing cursor
════════════════════════════════════════════════ */
function TypedText({ text, speed = 45 }) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const id = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return (
        <span>
            {displayed}
            <span className="animate-pulse">|</span>
        </span>
    );
}

/* ════════════════════════════════════════════════
   CODE PREVIEW CARD
════════════════════════════════════════════════ */
function CodePreview() {
    const [hintIdx, setHintIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const id = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setHintIdx(i => (i + 1) % HINT_MESSAGES.length);
                setVisible(true);
            }, 400);
        }, 3000);
        return () => clearInterval(id);
    }, []);

    const hint = HINT_MESSAGES[hintIdx];
    const hintColors = {
        error: 'border-red-500/60 bg-red-500/10 text-red-300',
        logic: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
        fix: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
    };

    return (
        <div className="relative w-full max-w-xl mx-auto">
            {/* glow */}
            <div className="absolute -inset-4 bg-violet-600/20 blur-3xl rounded-3xl pointer-events-none" />

            {/* editor window */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl overflow-hidden backdrop-blur-sm">
                {/* title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-3 text-xs text-slate-400 font-mono">fibonacci.js — HintHive Editor</span>
                </div>

                {/* code area */}
                <div className="px-5 py-5 font-mono text-sm leading-7 space-y-0.5">
                    {CODE_LINES.map((line, i) => (
                        <div key={i} className="flex gap-4">
                            <span className="select-none text-slate-600 w-4 text-right shrink-0">{i + 1}</span>
                            <span className={line.color || 'text-slate-400'}>
                                {'  '.repeat(line.indent)}{line.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* hint banner */}
                <div
                    className={`mx-4 mb-4 px-4 py-3 rounded-xl border text-xs font-medium flex items-start gap-3 transition-all duration-300 ${hintColors[hint.type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    style={{ transitionProperty: 'opacity, transform' }}
                >
                    <span className="text-base mt-0.5">{hint.icon}</span>
                    <span>{hint.msg}</span>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════
   FEATURE CARD
════════════════════════════════════════════════ */
function FeatureCard({ icon, title, desc, gradient, border }) {
    return (
        <div
            className={`group relative rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 
        hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 cursor-default backdrop-blur-sm`}
        >
            <div className="text-3xl mb-4">{icon}</div>
            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-violet-300 transition-colors">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

/* ════════════════════════════════════════════════
   MAIN LANDING PAGE
════════════════════════════════════════════════ */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    return (
        <div className="min-h-screen bg-[#07070f] text-white overflow-x-hidden">
            {/* ── background grain + gradient ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-[#07070f] to-cyan-950/30" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundSize: '128px',
                    }}
                />
            </div>

            {/* ══════════ NAVBAR ══════════ */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#07070f]/80 backdrop-blur-xl border-b border-white/10 shadow-xl' : ''
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* logo */}
                    <a href="#" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/30">
                            H
                        </div>
                        <span className="font-bold text-xl tracking-tight">
                            Hint<span className="text-violet-400">Hive</span>
                        </span>
                    </a>

                    {/* desktop links */}
                    <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
                        {['Features', 'How It Works', 'Testimonials'].map(link => (
                            <a
                                key={link}
                                href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                                className="hover:text-white transition-colors hover:text-violet-300"
                            >
                                {link}
                            </a>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
                            Sign In
                        </Link>
                        <Link to="/signup" className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-5 py-2 rounded-xl transition-all shadow-lg shadow-violet-600/30 hover:shadow-violet-500/40 hover:scale-105 active:scale-95">
                            Get Started Free
                        </Link>
                    </div>

                    {/* hamburger */}
                    <button
                        className="md:hidden text-slate-300 hover:text-white transition-colors"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            {menuOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                        </svg>
                    </button>
                </div>

                {/* mobile menu */}
                {menuOpen && (
                    <div className="md:hidden bg-[#0d0d1a]/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 space-y-3">
                        {['Features', 'How It Works', 'Testimonials'].map(link => (
                            <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                                className="block text-slate-300 hover:text-white transition-colors py-1"
                                onClick={() => setMenuOpen(false)}
                            >
                                {link}
                            </a>
                        ))}
                        <Link to="/signup" className="w-full mt-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white px-5 py-2.5 rounded-xl text-center block">
                            Get Started Free
                        </Link>
                    </div>
                )}
            </nav>

            {/* ══════════ HERO ══════════ */}
            <section className="relative z-10 pt-36 pb-24 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    {/* left copy */}
                    <div className="space-y-8">
                        {/* badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-xs font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                            </span>
                            AI-Powered Code Intelligence — Now Live
                        </div>

                        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
                            Code Smarter.<br />
                            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                                Debug Faster.
                            </span>
                        </h1>

                        <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                            <strong className="text-white">HintHive</strong> is your AI coding companion — it watches your code in real time,
                            catches syntax &amp; logic errors instantly, and guides you to the fix with clear, beginner-friendly hints.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/signup" className="group relative overflow-hidden bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-xl shadow-violet-600/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2">
                                Start Coding Free
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                            <button className="flex items-center gap-2 text-slate-300 hover:text-white border border-white/15 hover:border-white/30 px-7 py-3.5 rounded-2xl transition-all hover:bg-white/5">
                                <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                Watch Demo
                            </button>
                        </div>

                        {/* trust strip */}
                        <div className="flex flex-wrap gap-6 pt-2">
                            {STATS.map(s => (
                                <div key={s.label} className="text-center">
                                    <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* right — code preview */}
                    <div className="w-full">
                        <CodePreview />
                    </div>
                </div>
            </section>

            {/* ══════════ HOW IT WORKS ══════════ */}
            <section id="how-it-works" className="relative z-10 py-24 px-6">
                <div className="max-w-5xl mx-auto text-center mb-16">
                    <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">How It Works</span>
                    <h2 className="text-4xl font-bold mt-3">Three steps to bug-free code</h2>
                    <p className="text-slate-400 mt-4 max-w-xl mx-auto">HintHive integrates seamlessly into your workflow — no setup, no friction.</p>
                </div>

                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
                    {[
                        { step: '01', icon: '✍️', title: 'Write Your Code', desc: 'Type in any supported language inside the built-in HintHive editor.' },
                        { step: '02', icon: '🔎', title: 'AI Scans In Real Time', desc: 'Our AI engine analyses every keystroke for syntax and logical issues.' },
                        { step: '03', icon: '🛠️', title: 'Get Guided Fixes', desc: 'Receive clear explanations and one-click fixes to resolve issues fast.' },
                    ].map(({ step, icon, title, desc }) => (
                        <div key={step} className="relative group">
                            {/* connector */}
                            <div className="hidden md:block absolute top-8 right-0 w-1/2 h-px bg-gradient-to-r from-violet-500/50 to-transparent last:hidden" />
                            <div className="relative z-10 text-center space-y-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all hover:border-violet-500/40">
                                <div className="text-xs font-mono text-violet-400 font-semibold">{step}</div>
                                <div className="text-4xl">{icon}</div>
                                <h3 className="text-white font-semibold text-lg">{title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══════════ FEATURES ══════════ */}
            <section id="features" className="relative z-10 py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Features</span>
                        <h2 className="text-4xl font-bold mt-3">Everything you need to code confidently</h2>
                        <p className="text-slate-400 mt-4 max-w-xl mx-auto">Packed with intelligent features that make spotting and fixing bugs effortless.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ══════════ TESTIMONIALS ══════════ */}
            <section id="testimonials" className="relative z-10 py-24 px-6">
                <div className="max-w-5xl mx-auto text-center mb-16">
                    <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400">Testimonials</span>
                    <h2 className="text-4xl font-bold mt-3">Loved by developers everywhere</h2>
                </div>
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
                    {TESTIMONIALS.map(({ name, role, text, avatar }) => (
                        <div
                            key={name}
                            className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="text-3xl">{avatar}</div>
                                <div>
                                    <div className="font-semibold text-white text-sm">{name}</div>
                                    <div className="text-xs text-slate-500">{role}</div>
                                </div>
                            </div>
                            <div className="text-yellow-400 text-xs mb-3">★★★★★</div>
                            <p className="text-slate-300 text-sm leading-relaxed">"{text}"</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══════════ CTA BANNER ══════════ */}
            <section className="relative z-10 py-24 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="relative rounded-3xl overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-cyan-900/30 p-12 shadow-2xl">
                        {/* glow blobs */}
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 space-y-6">
                            <h2 className="text-4xl sm:text-5xl font-extrabold">
                                Ready to <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">stop guessing</span>?
                            </h2>
                            <p className="text-slate-300 text-lg max-w-xl mx-auto">
                                Join thousands of developers who write cleaner, smarter code every day with HintHive — completely free to start.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link to="/signup" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all duration-200 text-base text-center">
                                    Get Started — It's Free
                                </Link>
                                <button className="text-slate-300 hover:text-white border border-white/20 hover:border-white/40 px-8 py-4 rounded-2xl transition-all hover:bg-white/5 text-base">
                                    See Documentation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FOOTER ══════════ */}
            <footer className="relative z-10 border-t border-white/10 py-10 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold">H</div>
                        <span className="font-bold text-lg">Hint<span className="text-violet-400">Hive</span></span>
                    </div>
                    <p className="text-slate-500 text-sm text-center">
                        © {new Date().getFullYear()} HintHive. Built with ❤️ to make debugging painless.
                    </p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        {['Privacy', 'Terms', 'Contact'].map(l => (
                            <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
