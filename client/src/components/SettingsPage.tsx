import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save, Users } from 'lucide-react';

const SettingsPage = ({ viewSettings }: any) => {
    const token = localStorage.getItem('token');
    const orgId = localStorage.getItem('org_id');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [settings, setSettings] = useState({
        organization_type: 'Student Organization',
        treasurer_name: '',
        auditor_name: '',
        president_name: '',
        adviser_name: '',
        adviser2_name: ''
    });

    useEffect(() => {
        // @ts-ignore
        const fetchSettings = async () => {
            if (!viewSettings) return;
            setLoading(true);
            try {
                const query = `?semester=${encodeURIComponent(viewSettings.semester)}&school_year=${encodeURIComponent(viewSettings.school_year)}`;
                const res = await axios.get(`http://localhost:5000/api/settings/${orgId}${query}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setSettings({
                        organization_type: res.data.organization_type || 'Student Organization',
                        treasurer_name: res.data.treasurer_name || '',
                        auditor_name: res.data.auditor_name || '',
                        president_name: res.data.president_name || '',
                        adviser_name: res.data.adviser_name || '',
                        adviser2_name: res.data.adviser2_name || ''
                    });
                }
            } catch (err) {
                console.error(err);
                // toast.error("Failed to load settings"); // Suppress error for new semesters with no data yet
                // Reset form if not found
                setSettings(prev => ({ ...prev, treasurer_name: '', auditor_name: '', president_name: '', adviser_name: '', adviser2_name: '' }));
            } finally {
                setLoading(false);
            }
        };
        if (orgId) fetchSettings();
    }, [orgId, token, viewSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axios.put(`http://localhost:5000/api/settings/${orgId}`, {
                ...settings,
                current_semester: viewSettings.semester,
                current_school_year: viewSettings.school_year
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Officer Settings Saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading settings...</div>;

    return (
        <div className="max-w-7xl mx-auto py-8 font-outfit">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Organization Settings</h1>
                        <p className="text-slate-400">Manage officer signatories for reports.</p>
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold uppercase tracking-wider text-emerald-400">
                            <span>{viewSettings?.semester}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>{viewSettings?.school_year}</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl">
                        <Users size={32} className="text-emerald-400" />
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-8">
                    {/* Organization Info */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Organization Info</h3>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organization Type</label>
                            <select
                                name="organization_type"
                                value={settings.organization_type}
                                onChange={(e: any) => setSettings({ ...settings, organization_type: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option>Student Government</option>
                                <option>Academic</option>
                                <option>Non-Academic</option>
                                <option>Fraternity/Sorority</option>
                                <option>Religious</option>
                                <option>Socio-Civic</option>
                            </select>
                        </div>
                    </div>

                    {/* Officers Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Officer Signatories</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organization Treasurer</label>
                                <input
                                    type="text"
                                    name="treasurer_name"
                                    value={settings.treasurer_name}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organization Auditor</label>
                                <input
                                    type="text"
                                    name="auditor_name"
                                    value={settings.auditor_name}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organization Head / President</label>
                                <input
                                    type="text"
                                    name="president_name"
                                    value={settings.president_name}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advisers Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Organization Advisers</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adviser 1</label>
                                <input
                                    type="text"
                                    name="adviser_name"
                                    value={settings.adviser_name}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adviser 2 (Optional)</label>
                                <input
                                    type="text"
                                    name="adviser2_name"
                                    value={settings.adviser2_name}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                        >
                            <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
