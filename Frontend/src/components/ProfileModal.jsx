import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/* ════════════════════════════════════════════════════════════
   Profile Modal  — opened when user clicks their name chip
════════════════════════════════════════════════════════════ */
export default function ProfileModal({ onClose }) {
    const { user, updateProfile } = useAuth();
    const modalRef = useRef(null);

    const [tab, setTab] = useState('username');  // 'username' | 'password'

    // username tab state
    const [username, setUsername] = useState(user?.username || '');
    const [usernameMsg, setUsernameMsg] = useState('');
    const [usernameErr, setUsernameErr] = useState('');
    const [usernameLoading, setUsernameLoading] = useState(false);

    // password tab state
    const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
    const [pwMsg, setPwMsg] = useState('');
    const [pwErr, setPwErr] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    /* close on backdrop click */
    useEffect(() => {
        const handler = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    /* close on Escape */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    /* ── username submit ── */
    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        setUsernameMsg(''); setUsernameErr('');
        if (username.trim() === user?.username) {
            setUsernameErr('That is already your current username.');
            return;
        }
        if (username.trim().length < 3) {
            setUsernameErr('Username must be at least 3 characters.');
            return;
        }
        setUsernameLoading(true);
        try {
            await updateProfile({ username: username.trim() });
            setUsernameMsg('✅ Username updated successfully!');
        } catch (err) {
            setUsernameErr(err.response?.data?.detail || 'Failed to update username.');
        } finally {
            setUsernameLoading(false);
        }
    };

    /* ── password submit ── */
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwMsg(''); setPwErr('');
        if (!pwForm.current) { setPwErr('Please enter your current password.'); return; }
        if (pwForm.new.length < 6) { setPwErr('New password must be at least 6 characters.'); return; }
        if (pwForm.new !== pwForm.confirm) { setPwErr('New passwords do not match.'); return; }
        setPwLoading(true);
        try {
            await updateProfile({ current_password: pwForm.current, new_password: pwForm.new });
            setPwMsg('✅ Password changed successfully!');
            setPwForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPwErr(err.response?.data?.detail || 'Failed to change password.');
        } finally {
            setPwLoading(false);
        }
    };

    const inputCls = `w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white 
    placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all`;

    return (
        /* ── backdrop ── */
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            {/* ── modal card ── */}
            <div
                ref={modalRef}
                className="w-full max-w-md bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden
                   animate-fadeIn"
                style={{ animationDelay: '0ms' }}
            >
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-base shadow-lg shadow-violet-500/30">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{user?.username}</p>
                            <p className="text-slate-500 text-xs">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors hover:bg-white/10 rounded-lg p-1.5"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* tabs */}
                <div className="flex border-b border-white/10">
                    {[
                        { key: 'username', label: '✏️ Change Username' },
                        { key: 'password', label: '🔒 Change Password' },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setUsernameMsg(''); setUsernameErr(''); setPwMsg(''); setPwErr(''); }}
                            className={`flex-1 text-xs font-medium py-3 transition-all ${tab === t.key
                                    ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* body */}
                <div className="px-6 py-6">
                    {/* ─ Username tab ─ */}
                    {tab === 'username' && (
                        <form onSubmit={handleUsernameSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">New Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    minLength={3}
                                    maxLength={30}
                                    required
                                    placeholder="Enter new username"
                                    className={inputCls}
                                />
                                <p className="text-xs text-slate-600 mt-1.5">3–30 characters, must be unique.</p>
                            </div>

                            {usernameErr && (
                                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{usernameErr}</div>
                            )}
                            {usernameMsg && (
                                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">{usernameMsg}</div>
                            )}

                            <button
                                type="submit"
                                disabled={usernameLoading || !username.trim()}
                                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500
                           text-white font-semibold py-2.5 rounded-xl transition-all
                           hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-violet-600/20 text-sm"
                            >
                                {usernameLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Saving…
                                    </span>
                                ) : 'Update Username'}
                            </button>
                        </form>
                    )}

                    {/* ─ Password tab ─ */}
                    {tab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={pwForm.current}
                                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                                    required
                                    placeholder="••••••••"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={pwForm.new}
                                    onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))}
                                    minLength={6}
                                    required
                                    placeholder="At least 6 characters"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={pwForm.confirm}
                                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                                    required
                                    placeholder="••••••••"
                                    className={inputCls}
                                />
                            </div>

                            {pwErr && (
                                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{pwErr}</div>
                            )}
                            {pwMsg && (
                                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">{pwMsg}</div>
                            )}

                            <button
                                type="submit"
                                disabled={pwLoading}
                                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500
                           text-white font-semibold py-2.5 rounded-xl transition-all
                           hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-violet-600/20 text-sm"
                            >
                                {pwLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Changing…
                                    </span>
                                ) : 'Change Password'}
                            </button>
                        </form>
                    )}
                </div>

                {/* footer */}
                <div className="px-6 py-3 bg-white/5 border-t border-white/10 text-xs text-slate-600 text-center">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—'}
                </div>
            </div>
        </div>
    );
}
