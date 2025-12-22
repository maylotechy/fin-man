// @ts-ignore
import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Lock, UserCircle, ArrowRight } from "lucide-react";
// @ts-ignore
import usmLogo from '../assets/2025-usm-site-logo_retina_v3.png';

// @ts-ignore
const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // @ts-ignore
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', {
                username,
                password
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('org_id', res.data.org_id);

            toast.success(`Access Granted: Welcome back, ${res.data.username}!`);
            onLoginSuccess(res.data.token, res.data.username, res.data.org_id);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || "Invalid credentials. Please check your typing.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-outfit">
            <div className="w-full max-w-md bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">

                {/* Header */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <img
                        src={usmLogo}
                        alt="USM Logo"
                        className="w-28 h-28 object-contain mb-6 drop-shadow-lg"
                    />
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">USM FinMan</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Organization Financial Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                        <div className="relative group">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input
                                type="text" required placeholder="Enter society username"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 p-4 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input
                                type="password" required placeholder="Enter your password"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-medium placeholder:text-slate-400 p-4 pl-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight size={20} className="stroke-[3px]" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-slate-400 text-xs font-medium">
                        © 2025 University of Southern Mindanao
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;