import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { aiApi } from '../api/client';

/* ─── tag config ─────────────────────────────────────────── */
const TAG_META = {
    debugging: { emoji: '🐛', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
    learning: { emoji: '📚', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' },
    persistence: { emoji: '💪', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' },
    'problem-solving': { emoji: '🧩', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
    growth: { emoji: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
    creativity: { emoji: '✨', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/25' },
    building: { emoji: '🏗️', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
};

const DEFAULT_QUOTE = {
    quote: 'Every expert was once a beginner. Every bug is just a lesson in disguise.',
    author: 'HintHive Wisdom',
    tag: 'growth',
};

const REDIRECT_SECONDS = 8;

/* ─── floating particle ─────────────────────────────────── */
function Particle({ style }) {
    return <div className="absolute rounded-full pointer-events-none opacity-20 animate-pulse" style={style} />;
}

export default function WelcomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username || 'Developer';
    const isSignup = location.state?.isSignup || false;

    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);        // fade-in trigger
    const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
    const [quoteVisible, setQuoteVisible] = useState(false); // quote fade-in
    const countdownRef = useRef(null);

    /* ── fetch quote ── */
    useEffect(() => {
        aiApi.motivate()
            .then(({ data }) => setQuote(data))
            .catch(() => setQuote(DEFAULT_QUOTE))
            .finally(() => {
                setLoading(false);
                // stagger: page first, then quote
                setTimeout(() => setVisible(true), 80);
                setTimeout(() => setQuoteVisible(true), 600);
            });
    }, []);

    /* ── countdown & auto-redirect ── */
    useEffect(() => {
        countdownRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(countdownRef.current);
                    navigate('/dashboard');
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [navigate]);

    const goNow = () => {
        clearInterval(countdownRef.current);
        navigate('/dashboard');
    };

    const refreshQuote = () => {
        setQuoteVisible(false);
        setLoading(true);
        aiApi.motivate()
            .then(({ data }) => setQuote(data))
            .catch(() => setQuote(DEFAULT_QUOTE))
            .finally(() => {
                setLoading(false);
                setTimeout(() => setQuoteVisible(true), 200);
            });
    };

    const tag = TAG_META[quote?.tag] || TAG_META.growth;
    const progress = ((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100;

    /* random floating particles */
    const particles = [
        { width: 180, height: 180, background: 'radial-gradient(circle, #7c3aed44, transparent)', top: '8%', left: '5%' },
        { width: 240, height: 240, background: 'radial-gradient(circle, #0891b244, transparent)', top: '60%', right: '4%' },
        { width: 120, height: 120, background: 'radial-gradient(circle, #a855f733, transparent)', top: '35%', left: '55%' },
        { width: 90, height: 90, background: 'radial-gradient(circle, #06b6d433, transparent)', bottom: '15%', left: '20%' },
        { width: 160, height: 160, background: 'radial-gradient(circle, #7c3aed22, transparent)', top: '5%', right: '25%' },
    ];

    return (
        <div className="min-h-screen bg-[#07070f] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">

            {/* ── background particles ── */}
            {particles.map((p, i) => <Particle key={i} style={p} />)}

            {/* ── background grid ── */}
            <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

            {/* ══════════ CARD ══════════ */}
            <div className={`relative z-10 w-full max-w-2xl transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

                {/* glow behind card */}
                <div className="absolute -inset-8 bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-600/15 blur-3xl rounded-3xl pointer-events-none" />

                <div className="relative bg-[#0d0d1a]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">

                    {/* ── progress bar ── */}
                    <div className="h-0.5 bg-white/5 w-full">
                        <div
                            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="px-8 pt-10 pb-8 space-y-8">

                        {/* ── greeting row ── */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-4">
                                {/* avatar */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl font-bold shadow-xl shadow-violet-500/30 shrink-0">
                                    {username[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs text-emerald-400 font-medium tracking-wide uppercase">
                                            {isSignup ? 'Account Created' : 'Welcome Back'}
                                        </span>
                                    </div>
                                    <h1 className="text-2xl font-extrabold tracking-tight">
                                        {isSignup ? 'You\'re in, ' : 'Hey, '}
                                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                            {username}!
                                        </span>
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-0.5">
                                        {isSignup
                                            ? 'Your HintHive journey starts now 🚀'
                                            : 'HintHive missed you. Let\'s build something great.'}
                                    </p>
                                </div>
                            </div>

                            {/* HintHive logo pill */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs">H</div>
                                <span className="text-sm font-semibold">Hint<span className="text-violet-400">Hive</span></span>
                            </div>
                        </div>

                        {/* ── divider ── */}
                        <div className="border-t border-white/5" />

                        {/* ── quote block ── */}
                        <div className={`transition-all duration-700 ease-out ${quoteVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {loading ? (
                                <div className="flex flex-col items-center py-8 gap-4">
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce"
                                                style={{ animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                    <p className="text-slate-600 text-sm">Groq is crafting your inspiration…</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* tag badge */}
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${tag.bg} ${tag.color}`}>
                                            <span>{tag.emoji}</span>
                                            {quote?.tag?.replace('-', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-600">· AI-generated for you</span>
                                    </div>

                                    {/* quote text */}
                                    <blockquote className="relative">
                                        <span className="absolute -top-4 -left-2 text-6xl text-violet-500/20 font-serif leading-none select-none">"</span>
                                        <p className="text-xl sm:text-2xl font-semibold leading-snug text-white/90 pl-4 italic">
                                            {quote?.quote}
                                        </p>
                                        <span className="absolute -bottom-6 right-0 text-6xl text-violet-500/20 font-serif leading-none select-none">"</span>
                                    </blockquote>

                                    {/* author */}
                                    <div className="flex items-center gap-2 pt-2 pl-4">
                                        <div className="w-5 h-px bg-gradient-to-r from-violet-500 to-transparent" />
                                        <p className="text-sm text-slate-400 font-medium">{quote?.author}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── divider ── */}
                        <div className="border-t border-white/5" />

                        {/* ── action row ── */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {/* Go to Dashboard CTA */}
                            <button
                                onClick={goNow}
                                className="group relative w-full sm:w-auto flex-1 overflow-hidden bg-gradient-to-r from-violet-600 to-cyan-600
                           hover:from-violet-500 hover:to-cyan-500 text-white font-semibold
                           px-8 py-3.5 rounded-2xl transition-all duration-200
                           shadow-xl shadow-violet-600/30 hover:shadow-violet-500/40
                           hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>Go to Dashboard</span>
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                    fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                                {/* shimmer */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
                            </button>

                            {/* refresh quote */}
                            <button
                                onClick={refreshQuote}
                                disabled={loading}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-white/10
                           hover:border-violet-500/40 px-5 py-3.5 rounded-2xl transition-all hover:bg-white/5
                           disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Get another quote"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                New Quote
                            </button>
                        </div>

                        {/* ── countdown ── */}
                        <p className="text-center text-xs text-slate-600">
                            Auto-redirecting to dashboard in{' '}
                            <span className="text-violet-400 font-semibold tabular-nums">{countdown}s</span>
                            …
                        </p>
                    </div>
                </div>

                {/* ── powered by ── */}
                <p className="text-center text-xs text-slate-700 mt-4">
                    Quotes powered by{' '}
                    <span className="text-violet-600">Groq</span>
                    {' '}·{' '}
                    <span className="text-slate-600">llama-3.3-70b-versatile</span>
                </p>
            </div>
        </div>
    );
}
