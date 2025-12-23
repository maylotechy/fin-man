// @ts-ignore
// @ts-ignore
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Plus,
    Wallet,
    History,
    Loader2,
    X,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Calendar,
    Save,
    AlertTriangle
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';


const DashboardView = ({ token, username, orgId, viewSettings, setViewSettings }: any) => {
    // const navigate = useNavigate(); // Removed
    const [transactions, setTransactions] = useState([]);
    const [funds, setFunds] = useState([]);

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isOpen, setIsOpen] = useState(false);
    const [transactionMode, setTransactionMode] = useState<'INFLOW' | 'OUTFLOW'>('OUTFLOW');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState(null);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Deficit Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingSubmission, setPendingSubmission] = useState<any>(null);

    const initialFormState = {
        org_id: orgId || localStorage.getItem('org_id') || '',
        amount: '',
        fund_id: '',
        description: '',
        transaction_date: '', // Manual Date

        // Outflow Specifics
        category: 'Supplies',
        payee_merchant: '',
        evidence_number: '',
        semester: viewSettings.semester,
        school_year: viewSettings.school_year,
        event_name: '',

        document_type: 'Official Receipt',
        duration: '',
        activity_approval_date: '',
        resolution_number: '',
    };

    const [formData, setFormData] = useState(initialFormState);

    // @ts-ignore
    const fetchData = async () => {
        if (!orgId || orgId === 'undefined' || orgId === 'null') {
            console.error("Invalid Org ID:", orgId);
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // @ts-ignore
            const [transRes, fundsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/transactions?org_id=${orgId}`, config),
                // Pass current View Semester/Year to fetch specific funds
                axios.get(`http://localhost:5000/api/transactions/funds/${orgId}?semester=${viewSettings.semester}&school_year=${viewSettings.school_year}`, config)
            ]);

            const transData = transRes.data;
            setTransactions(transData);
            setFunds(fundsRes.data || []);

        } catch (err) {
            console.error("Data Sync Error:", err);
            toast.error("Failed to load dashboard data.");
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch funds when viewSettings change (to get updated balances for that semester)
    useEffect(() => {
        if (orgId) {
            fetchData();
        }
        // eslint-disable-next-line
    }, [orgId, viewSettings]);

    // Update form defaults when view settings change
    useEffect(() => {
        setFormData((prev: any) => ({
            ...prev,
            semester: viewSettings.semester,
            school_year: viewSettings.school_year
        }));
    }, [viewSettings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, filterDate, viewSettings]);

    const handleOpenModal = (mode: 'INFLOW' | 'OUTFLOW') => {
        setTransactionMode(mode);
        // Reset form to match current VIEW
        setFormData({
            ...initialFormState,
            semester: viewSettings.semester,
            school_year: viewSettings.school_year,
            description: mode === 'INFLOW' ? 'Collection' : '',
            category: mode === 'INFLOW' ? '' : 'Supplies'
        });
        setIsOpen(true);
    };

    // @ts-ignore
    const handleSaveSettings = async () => {
        if (!orgId) return;
        try {
            await axios.put(`http://localhost:5000/api/settings/${orgId}`, {
                current_semester: viewSettings.semester,
                current_school_year: viewSettings.school_year,
                organization_type: viewSettings.organization_type
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Global Period Updated Successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update global settings");
        }
    };

    // @ts-ignore
    const handleSubmit = async (e: React.FormEvent | null, isConfirmation = false) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);

        const data = new FormData();
        if (file) data.append('image', file);

        const submissionData = isConfirmation && pendingSubmission ? pendingSubmission : { ...formData, type: transactionMode };

        Object.keys(submissionData).forEach(key => data.append(key, (submissionData as any)[key]));

        if (isConfirmation) data.append('confirmed_deficit', 'true');

        try {
            await axios.post('http://localhost:5000/api/transactions/add', data, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            toast.success(isConfirmation ? 'Deficit Approved' : 'Transaction Success');
            setIsOpen(false);
            setIsConfirmOpen(false);
            setPendingSubmission(null);
            fetchData();
            // Don't reset full form state, just clearing inputs, keeping period settings
            setFormData({
                ...initialFormState,
                semester: viewSettings.semester,
                school_year: viewSettings.school_year
            });
            setFile(null);
        } catch (err: any) {
            if (err.response?.status === 409 && err.response?.data?.requires_confirmation) {
                setConfirmMessage(err.response.data.message);
                setPendingSubmission({ ...formData, type: transactionMode });
                setIsConfirmOpen(true);
                return;
            }
            toast.error(err.response?.data?.message || "Error saving record");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeficit = () => handleSubmit(null, true);

    // --- DERIVED LOGIC FOR METRICS (Filtered by View State) ---
    const currentSemTransactions = transactions.filter((t: any) =>
        t.semester === viewSettings.semester &&
        t.school_year === viewSettings.school_year
    );

    // Calculate Balance for THIS Semester only
    const semInflow = currentSemTransactions.filter((t: any) => t.type === 'INFLOW').reduce((acc: any, curr: any) => acc + Number(curr.amount), 0);
    const semOutflow = currentSemTransactions.filter((t: any) => t.type === 'OUTFLOW').reduce((acc: any, curr: any) => acc + Number(curr.amount), 0);
    const semBalance = semInflow - semOutflow;



    // Filter History Table strictly by viewSettings
    const filteredTransactions = transactions.filter((t: any) => {
        const matchesSem = t.semester === viewSettings.semester;
        const matchesSY = t.school_year === viewSettings.school_year;
        const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.payee_merchant?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || t.type === filterType;
        const matchesDate = !filterDate || new Date(t.transaction_date).toLocaleDateString() === new Date(filterDate).toLocaleDateString();

        return matchesSem && matchesSY && matchesSearch && matchesType && matchesDate;
    });
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-7xl mx-auto font-outfit">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Financial Ledger</h1>

                    {/* Period Selector - Direct Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
                        <div className="flex items-center gap-2 px-2">
                            <Calendar size={18} className="text-emerald-600" />
                            <span className="text-xs font-bold uppercase text-slate-400">Current Semester:</span>
                        </div>
                        <select
                            value={viewSettings.semester}
                            onChange={(e) => setViewSettings(prev => ({ ...prev, semester: e.target.value }))}
                            className="bg-slate-50 hover:bg-slate-100 border-none text-sm font-bold text-slate-700 py-2 pl-3 pr-8 rounded-lg cursor-pointer focus:ring-0"
                        >
                            <option>First Semester</option>
                            <option>Second Semester</option>
                            <option>Summer Term</option>
                        </select>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <select
                            value={viewSettings.school_year}
                            onChange={(e) => setViewSettings(prev => ({ ...prev, school_year: e.target.value }))}
                            className="bg-slate-50 hover:bg-slate-100 border-none text-sm font-bold text-slate-700 py-2 pl-3 pr-8 rounded-lg cursor-pointer focus:ring-0"
                        >
                            <option>S.Y. 2025 - 2026</option>
                            <option>S.Y. 2026 - 2027</option>
                            <option>S.Y. 2027 - 2028</option>
                            <option>S.Y. 2028 - 2029</option>
                            <option>S.Y. 2029 - 2030</option>
                        </select>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <button
                            onClick={handleSaveSettings}
                            title="Save as Global Default"
                            className="p-2 ml-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                            <Save size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex gap-3 w-full xl:w-auto">
                    {/* Split Buttons */}
                    <button onClick={() => handleOpenModal('INFLOW')} className="flex-1 xl:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200">
                        <ArrowDownRight size={24} /> Add Income
                    </button>
                    <button onClick={() => handleOpenModal('OUTFLOW')} className="flex-1 xl:flex-none bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200">
                        <ArrowUpRight size={24} /> Add Expense
                    </button>
                </div>
            </div>

            {/* Metrics Section */}
            <div className="mb-10 space-y-6">
                {/* Row 1: Main Balance Card (Full Width) */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group w-full border border-slate-800">
                    <div className="relative z-10 flex justify-between items-center h-full">
                        <div>
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">
                                Balance ({viewSettings.semester})
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-400">₱</span>
                                <h2 className="text-4xl xl:text-6xl font-bold tracking-tight">{semBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                            </div>
                        </div>
                        <Wallet className="text-emerald-500/20 h-32 w-32 absolute -right-6 -bottom-6 rotate-12" />
                    </div>
                </div>

                {/* Row 2: Inflow/Outflow Summaries (Side by Side) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                        <div>
                            <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Inflows ({viewSettings.semester})</p>
                            <h3 className="text-3xl font-black text-emerald-700">₱{semInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="bg-emerald-200/50 p-3 rounded-2xl text-emerald-600">
                            <TrendingUp size={32} />
                        </div>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex items-center justify-between">
                        <div>
                            <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Outflows ({viewSettings.semester})</p>
                            <h3 className="text-3xl font-black text-rose-700">₱{semOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="bg-rose-200/50 p-3 rounded-2xl text-rose-600">
                            <ArrowDownRight size={32} />
                        </div>
                    </div>
                </div>

                {/* Row 3: Funds Breakdown (Grid) */}
                <div>
                    <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-3 ml-1">Fund Breakdown ({viewSettings.semester})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {funds.map((fund: any) => {
                            // Use the balance directly from the DB (it's now semester-specific)
                            const semFundBal = Number(fund.balance);
                            const isNegative = semFundBal < 0;

                            return (
                                <div key={fund.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32">
                                    <div>
                                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 h-8 line-clamp-2">{fund.source_name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-bold ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                                                ₱{semFundBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    {isNegative && <span className="text-[10px] text-rose-500 font-bold mt-auto">Deficit Warning</span>}
                                </div>
                            );
                        })}
                        {funds.length === 0 && (
                            <div className="col-span-full p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                No funds configured. Please check database.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <History size={24} className="text-slate-900" />
                        <h3 className="font-bold font-outfit text-2xl text-slate-900 tracking-tight">Transaction History</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        {/* Date Filter */}
                        <input
                            type="date"
                            className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />

                        {/* Type Filter */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-slate-50 border border-slate-200 pl-4 pr-10 py-2 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">All Types</option>
                                <option value="INFLOW">Income</option>
                                <option value="OUTFLOW">Expense</option>
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Search..." className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-8 py-5 text-xs font-extrabold text-slate-600 uppercase tracking-wider">Date & Fund</th>
                                <th className="px-8 py-5 text-xs font-extrabold text-slate-600 uppercase tracking-wider">Type</th>
                                <th className="px-8 py-5 text-xs font-extrabold text-slate-600 uppercase tracking-wider">Transaction Details</th>
                                <th className="px-8 py-5 text-xs font-extrabold text-slate-600 uppercase tracking-wider text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTransactions.length > 0 ? (
                                paginatedTransactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-6 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-base">{new Date(t.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-blue-50 text-blue-600 border-blue-100 w-fit mt-1">{t.source_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 align-top">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${t.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 align-top">
                                            {/* Merchant / Payee */}
                                            <p className="text-base font-bold text-slate-900 mb-1">{t.type === 'INFLOW' ? t.description : (t.payee_merchant || 'Unspecified Payee')}</p>

                                            {/* Description (Only for Outflow as secondary text) */}
                                            {t.type === 'OUTFLOW' && <p className="text-sm font-medium text-slate-600 mb-2">{t.description}</p>}

                                            {/* Meta Tags - Hide Category for Inflow */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {t.event_name && <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{t.event_name}</span>}
                                                {t.type === 'OUTFLOW' && <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{t.category}</span>}
                                            </div>
                                        </td>
                                        <td className={`px-8 py-6 text-right align-top font-bold text-base ${t.type === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'INFLOW' ? '+' : '-'} ₱{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-500 italic bg-slate-50/50">
                                        No transaction history found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <span className="text-sm font-medium text-slate-500">
                        Showing page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN MODAL */}
            <Transition show={isOpen} as={React.Fragment}>
                <Dialog onClose={() => !isSubmitting && setIsOpen(false)} className="relative z-50">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className={`w-full ${transactionMode === 'OUTFLOW' ? 'max-w-5xl' : 'max-w-5xl'} rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden`}>
                                {/* Modal Header with Background */}
                                <div className={`px-8 py-6 flex justify-between items-center ${transactionMode === 'INFLOW' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                    <div>
                                        <Dialog.Title className="text-2xl font-black tracking-tight text-white">
                                            {transactionMode === 'INFLOW' ? 'Record Income' : 'Record Expense'}
                                        </Dialog.Title>
                                        <p className="text-white/80 text-sm font-medium mt-1">Fill in the details for this transaction.</p>
                                    </div>
                                    <button onClick={() => setIsOpen(false)} className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-all"><X size={20} /></button>
                                </div>

                                <div className="p-8">
                                    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">

                                        {/* Row 1: Fund & Date/Amount */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Fund Source */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Fund Source</label>
                                                <select required className="w-full bg-slate-50 border border-slate-200 pl-8 py-5 pr-4 rounded-2xl font-medium text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                                    value={formData.fund_id} onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}>
                                                    <option value="">Select Fund Source...</option>
                                                    {funds.map((fund: any) => (
                                                        <option key={fund.id} value={fund.id}>{fund.source_name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Amount</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                                                    <input type="number" required placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 pl-8 p-4 rounded-2xl font-black text-xl text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                                        value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Date & School Year/Sem */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Transaction Date</label>
                                                <input type="date" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                                    value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Semester (Read-Only)</label>
                                                <input type="text" readOnly className="w-full bg-slate-100 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed opacity-75 focus:outline-none"
                                                    value={formData.semester} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">S.Y. (Read-Only)</label>
                                                <input type="text" readOnly className="w-full bg-slate-100 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed opacity-75 focus:outline-none"
                                                    value={formData.school_year} />
                                            </div>
                                        </div>

                                        {/* DYNAMIC FIELDS BASED ON MODE */}
                                        {transactionMode === 'OUTFLOW' ? (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Category</label>
                                                        <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                                            <option>Supplies</option>
                                                            <option>Meals/Snacks</option>
                                                            <option>Transportation</option>
                                                            <option>Honorarium</option>
                                                            <option>Equipment</option>
                                                            <option>Others</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Evidence / Ref No.</label>
                                                        <input type="text" placeholder="OR# or Control#" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.evidence_number} onChange={(e) => setFormData({ ...formData, evidence_number: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Payee / Merchant</label>
                                                        <input type="text" required placeholder="Paid to..." className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.payee_merchant} onChange={(e) => setFormData({ ...formData, payee_merchant: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Event Name</label>
                                                        <input type="text" required placeholder="Event..." className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.event_name} onChange={(e) => setFormData({ ...formData, event_name: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Duration</label>
                                                        <input type="text" placeholder="e.g. 2 days" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Approval Date</label>
                                                        <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.activity_approval_date} onChange={(e) => setFormData({ ...formData, activity_approval_date: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Resolution No.</label>
                                                        <input type="text" placeholder="Res. #" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                            value={formData.resolution_number} onChange={(e) => setFormData({ ...formData, resolution_number: e.target.value })} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Description / Particulars</label>
                                                    <input type="text" required placeholder="Specific description of expense..." className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                        value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                                </div>
                                            </>
                                        ) : (
                                            // INFLOW FIELDS
                                            <>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Description / Source Details</label>
                                                    <input type="text" required placeholder="Details of income..." className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                                                        value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                                </div>
                                            </>
                                        )}

                                        {/* Attachment */}
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 border-dashed">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Supporting Check/Receipt/Document</label>
                                            <input type="file" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white file:text-emerald-700 hover:file:bg-emerald-50 transition-all"
                                                onChange={(e: any) => setFile(e.target.files[0])} />
                                        </div>

                                        <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-2xl font-black text-xl shadow-xl text-white transition-all transform hover:scale-[1.01] active:scale-[0.99] ${transactionMode === 'INFLOW' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}>
                                            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : (transactionMode === 'INFLOW' ? 'Confirm Income Transaction' : 'Authorize Expense Payment')}
                                        </button>
                                    </form>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* CONFIRMATION MODAL (Keep Existing Logic) */}
            <Transition show={isConfirmOpen} as={React.Fragment}>
                <Dialog onClose={() => setIsConfirmOpen(false)} className="relative z-50">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border border-rose-100">
                                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600"><AlertTriangle size={32} /></div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Insufficient Funds</h3>
                                <p className="text-slate-600 text-sm mb-6">{confirmMessage}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsConfirmOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-700">Cancel</button>
                                    <button onClick={confirmDeficit} className="flex-1 bg-rose-600 hover:bg-rose-700 py-3 rounded-xl font-bold text-white shadow-lg">Proceed</button>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default DashboardView;