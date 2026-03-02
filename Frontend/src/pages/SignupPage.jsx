import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const { signup, login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            await signup(form.username, form.email, form.password);
            // auto-login after creating the account
            const me = await login(form.email, form.password);
            navigate('/welcome', { state: { username: me.username, isSignup: true } });
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#07070f] flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute top-[-10rem] right-[-10rem] w-96 h-96 bg-violet-700/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10rem] left-[-10rem] w-96 h-96 bg-cyan-700/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/30">H</div>
                        <span className="font-bold text-2xl text-white">Hint<span className="text-violet-400">Hive</span></span>
                    </Link>
                    <p className="text-slate-400 mt-3 text-sm">Create your free account to get started.</p>
                </div>

                <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                    <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>

                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="signup-username">Username</label>
                            <input
                                id="signup-username"
                                name="username"
                                type="text"
                                required
                                minLength={3}
                                value={form.username}
                                onChange={handleChange}
                                placeholder="coolcoder"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="signup-email">Email</label>
                            <input
                                id="signup-email"
                                name="email"
                                type="email"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="signup-password">Password</label>
                            <input
                                id="signup-password"
                                name="password"
                                type="password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="signup-confirm">Confirm Password</label>
                            <input
                                id="signup-confirm"
                                name="confirm"
                                type="password"
                                required
                                value={form.confirm}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600
                           focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 
                         text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-600/30 
                         hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Creating account…
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
