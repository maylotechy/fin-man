import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import DashboardView from './components/DashboardView';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import { Toaster } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { LayoutDashboard, FileText, LogOut, AlertTriangle, X, Settings } from 'lucide-react';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const [currentUser, setCurrentUser] = useState('');
    const [orgId, setOrgId] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Logout Confirmation State
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('username');
        const storedOrgId = localStorage.getItem('org_id');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setCurrentUser(storedUser);
            if (storedOrgId) setOrgId(storedOrgId);
            setIsAuthenticated(true);
        }
    }, []);

    const handleLoginSuccess = (newToken, user, organizationId) => {
        setToken(newToken);
        setCurrentUser(user);
        setOrgId(organizationId);
        setIsAuthenticated(true);

        // Persist
        localStorage.setItem('token', newToken);
        localStorage.setItem('username', user);
        localStorage.setItem('org_id', organizationId);
    };

    const confirmLogout = () => {
        setToken(null);
        setCurrentUser('');
        setOrgId(null);
        setIsAuthenticated(false);
        setIsLogoutConfirmOpen(false);
        localStorage.clear();
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="flex h-screen bg-slate-50 font-outfit">
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'font-bold text-lg',
                    style: {
                        padding: '16px 24px',
                        borderRadius: '16px',
                        fontSize: '16px',
                        maxWidth: '500px',
                    },
                    success: {
                        style: {
                            background: '#10b981', // Emerald-500
                            color: 'white',
                            iconTheme: { primary: 'white', secondary: '#10b981' }
                        },
                    },
                    error: {
                        style: {
                            background: '#f43f5e', // Rose-500
                            color: 'white',
                            iconTheme: { primary: 'white', secondary: '#f43f5e' }
                        },
                    },
                }}
            />

            {/* SIDEBAR - Fixed Width (No Toggle) */}
            <aside className="w-72 bg-[#022c22] border-r border-emerald-900 flex flex-col fixed h-full z-20 text-white">
                <div className="h-28 flex items-center px-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/50 flex-shrink-0">
                            <span className="text-white font-black text-xl">F</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">USM FinMan</h1>
                            <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">System</span>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-2 flex-1 mt-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'dashboard'
                            ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/20'
                            : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-white'
                            }`}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={22} className={activeTab === 'dashboard' ? 'text-white' : ''} />
                        <span className="text-sm">Dashboard</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'reports'
                            ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/20'
                            : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-white'
                            }`}
                        title="Reports"
                    >
                        <FileText size={22} className={activeTab === 'reports' ? 'text-white' : ''} />
                        <span className="text-sm">ISO Reports</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'settings'
                            ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/20'
                            : 'text-emerald-100/70 hover:bg-emerald-900/50 hover:text-white'
                            }`}
                        title="Settings"
                    >
                        <Settings size={22} className={activeTab === 'settings' ? 'text-white' : ''} />
                        <span className="text-sm">Org Settings</span>
                    </button>
                </div>

                {/* Sidebar Footer */}
                <div className="p-6 border-t border-emerald-900/50">
                    <button
                        onClick={() => setIsLogoutConfirmOpen(true)}
                        className="w-full flex items-center gap-4 p-3.5 rounded-xl text-emerald-100/70 hover:bg-rose-900/30 hover:text-rose-200 transition-all font-medium"
                        title="Logout"
                    >
                        <LogOut size={22} />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col ml-72 transition-all duration-300">

                {/* HEADER */}
                <header className="px-10 pt-8 pb-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center gap-5">
                            {/* Separated Logo Box */}
                            <div className="w-12 h-12 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                                <span className="text-white font-bold text-sm">UP</span>
                            </div>

                            {/* Separated Org Name Text */}
                            <div className="bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{currentUser || 'ORGANIZATION'}</h2>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-0.5">Organization Portal</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="px-10 pb-10">
                    {activeTab === 'dashboard' && <DashboardView token={token} username={currentUser} orgId={orgId} />}
                    {activeTab === 'reports' && <ReportsPage />}
                    {activeTab === 'settings' && <SettingsPage />}
                </main>
            </div>

            {/* LOGOUT CONFIRMATION MODAL */}
            <Transition show={isLogoutConfirmOpen} as={React.Fragment}>
                <Dialog onClose={() => setIsLogoutConfirmOpen(false)} className="relative z-50">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border border-slate-100">
                                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
                                    <LogOut size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Logout</h3>
                                <p className="text-slate-600 text-sm mb-6">Are you sure you want to end your session?</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsLogoutConfirmOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold text-slate-700 transition-colors">Cancel</button>
                                    <button onClick={confirmLogout} className="flex-1 bg-rose-600 hover:bg-rose-700 py-3 rounded-xl font-bold text-white shadow-lg shadow-rose-200 transition-all">Logout</button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

export default App;
