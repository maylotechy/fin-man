// @ts-ignore
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [reportType, setReportType] = useState<'SEMESTRAL' | 'LIQUIDATION'>('SEMESTRAL');
    const [semester, setSemester] = useState('First Semester');
    const [schoolYear, setSchoolYear] = useState('S.Y. 2025 - 2026');
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    const schoolYearOptions = [
        'S.Y. 2025 - 2026',
        'S.Y. 2026 - 2027',
        'S.Y. 2027 - 2028',
        'S.Y. 2028 - 2029',
        'S.Y. 2029 - 2030'
    ];

    useEffect(() => {
        // @ts-ignore
        const fetchData = async () => {
            const orgId = localStorage.getItem('org_id');
            try {
                const settingsRes = await axios.get(`http://localhost:5000/api/settings/${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
                if (settingsRes.data) {
                    setSemester(settingsRes.data.current_semester || 'First Semester');
                    setSchoolYear(settingsRes.data.current_school_year || 'S.Y. 2025 - 2026');
                }
            } catch (err) {
                console.warn("Using defaults");
            }

            try {
                const transRes = await axios.get(`http://localhost:5000/api/transactions?org_id=${orgId}`, { headers: { Authorization: `Bearer ${token}` } });
                setTransactions(transRes.data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load transactions.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const filteredData = transactions.filter((t: any) => {
        if (!t.semester || !t.school_year) return false;
        return t.semester === semester && t.school_year === schoolYear;
    }).sort((a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());


    const generateSemestralReport = () => {
        const doc = new jsPDF();
        const orgName = "Philippine Society of Information Technology Students (USM-PSITS)";
        const USM_GREEN = '#006838';

        try {
            toast.loading("Generating Semestral Report...");
            const data = filteredData;

            // Header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(USM_GREEN);
            doc.text("UNIVERSITY OF SOUTHERN MINDANAO", 105, 12, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text("OFFICE OF STUDENT AFFAIRS", 105, 17, { align: "center" });

            doc.setFont("helvetica", "bold");
            doc.text(orgName.toUpperCase(), 105, 23, { align: "center" });

            doc.setFontSize(13);
            doc.text("SEMESTRAL FINANCIAL REPORT", 105, 33, { align: "center" });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${semester}, ${schoolYear}`, 105, 39, { align: "center" });
            doc.text(`As of ${new Date().toLocaleDateString()}`, 105, 44, { align: "center" });

            // Sort data to separate Inflows and Outflows (Inflows first)
            const inflows = data.filter((t: any) => t.type === 'INFLOW');
            const outflows = data.filter((t: any) => t.type === 'OUTFLOW');
            const table1Data = [...inflows, ...outflows];

            let finalY = 50;
            let runningBalance = 0;
            const cashFlowBody = table1Data.map((t: any) => {
                const isInflow = t.type === 'INFLOW';
                const amt = Number(t.amount);
                runningBalance += isInflow ? amt : -amt;
                return [
                    new Date(t.transaction_date).toLocaleDateString(),
                    isInflow ? (t.source_name || t.category) : '',
                    isInflow ? `P ${amt.toLocaleString()}` : '',
                    !isInflow ? (t.description || t.payee_merchant) : '',
                    !isInflow ? `P ${amt.toLocaleString()}` : '',
                    `P ${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ];
            });

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Table 1: Cash Flow Summary (Receipts & Disbursements)", 14, finalY);

            autoTable(doc, {
                startY: finalY + 2,
                head: [['Date', 'Inflow (Nature)', 'Amount', 'Outflow (Particulars)', 'Amount', 'Balance']],
                body: cashFlowBody,
                theme: 'grid',
                headStyles: { fillColor: USM_GREEN, halign: 'center', fontSize: 8 },
                styles: { fontSize: 7, cellPadding: 1.5 },
                columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });

            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 15;

            // Table 2
            const inflowData = data.filter((t: any) => t.type === 'INFLOW');
            doc.text("Table 2: Income History (Cash Inflows by Fund)", 14, finalY);
            autoTable(doc, {
                startY: finalY + 2,
                head: [['Date', 'Source / Description', 'Amount', 'Fund Credited', 'Remarks']],
                body: inflowData.map((t: any) => [
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.description || 'Collection',
                    `P ${Number(t.amount).toLocaleString()}`,
                    t.source_name || 'General Fund',
                    ''
                ]),
                theme: 'grid',
                headStyles: { fillColor: USM_GREEN, halign: 'center', fontSize: 8 },
                styles: { fontSize: 7 }
            });

            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 15;
            if (finalY > 230) { doc.addPage(); finalY = 20; }

            // Table 3
            const outflowData = data.filter((t: any) => t.type === 'OUTFLOW');
            doc.text("Table 3: Summary of Expenditures", 14, finalY);
            autoTable(doc, {
                startY: finalY + 2,
                head: [['Date', 'Payee', 'Particulars', 'Amount', 'Event', 'Fund', 'Legal Basis', 'Att.']],
                body: outflowData.map((t: any) => [
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.payee_merchant, t.description, `P ${Number(t.amount).toLocaleString()}`,
                    t.event_name || 'N/A', t.source_name || 'General',
                    t.evidence_number || 'OR', t.attachment_url ? 'Yes' : 'No'
                ]),
                theme: 'grid',
                headStyles: { fillColor: USM_GREEN, halign: 'center', fontSize: 8 },
                styles: { fontSize: 7 }
            });

            addSignatories(doc);
            doc.save(`Semestral_Report_${semester.replace(/\s/g, '_')}_${schoolYear}.pdf`);
            toast.dismiss(); toast.success("Semestral Report Generated!");
        } catch (err) {
            console.error(err); toast.dismiss(); toast.error("Generate failed");
        }
    };

    const generateLiquidationReport = () => {
        const doc = new jsPDF();
        const orgName = "Philippine Society of Information Technology Students (USM-PSITS)";
        const USM_GREEN = '#006838';
        const data = filteredData;

        try {
            toast.loading("Generating Liquidation Report...");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(USM_GREEN);
            doc.text("UNIVERSITY OF SOUTHERN MINDANAO", 105, 15, { align: "center" });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text("OFFICE OF STUDENT AFFAIRS", 105, 20, { align: "center" });
            doc.setFont("helvetica", "bold");
            doc.text(orgName.toUpperCase(), 105, 25, { align: "center" });
            doc.setFontSize(14);
            doc.text("LIQUIDATION REPORT", 105, 35, { align: "center" });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`${semester}, ${schoolYear}`, 105, 40, { align: "center" });

            autoTable(doc, {
                startY: 50,
                head: [['#', 'Nature', 'Payee/Merchant', 'Amount', 'Date', 'Evidence', 'Remarks']],
                body: data.map((t: any, index: number) => [
                    index + 1, t.source_name || t.category, t.payee_merchant || t.description,
                    `P ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    new Date(t.transaction_date).toLocaleDateString(), t.evidence_number || 'OR', ''
                ]),
                theme: 'grid',
                headStyles: { fillColor: USM_GREEN, halign: 'center' },
                styles: { fontSize: 8 },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right' } }
            });

            addSignatories(doc);
            doc.save(`Liquidation_Report_${semester.replace(/\s/g, '_')}.pdf`);
            toast.dismiss(); toast.success("Liquidation Report Generated!");
        } catch (err) {
            console.error(err); toast.dismiss(); toast.error("Generate failed");
        }
    };

    const addSignatories = (doc: any) => {
        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 30;
        if (finalY > 250) { doc.addPage(); finalY = 40; }
        const startX = 20; const colWidth = 60;
        doc.setFontSize(10); doc.setTextColor(0);

        doc.text("Prepared by:", startX, finalY);
        doc.line(startX, finalY + 15, startX + 50, finalY + 15);
        doc.text("TREASURER", startX, finalY + 20);

        doc.text("Certified Correct:", startX + colWidth, finalY);
        doc.line(startX + colWidth, finalY + 15, startX + colWidth + 50, finalY + 15);
        doc.text("AUDITOR", startX + colWidth, finalY + 20);

        doc.text("Attested by:", startX + colWidth * 2, finalY);
        doc.line(startX + colWidth * 2, finalY + 15, startX + colWidth * 2 + 50, finalY + 15);
        doc.text("PRESIDENT", startX + colWidth * 2, finalY + 20);

        doc.text("Noted by:", startX, finalY + 35);
        doc.line(startX, finalY + 50, startX + 50, finalY + 50);
        doc.text("ADVISER", startX, finalY + 55);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 font-outfit">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Financial Reports</h1>

            {/* Controls Bar - Reverted to Horizontal */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap items-end gap-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Report Type</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setReportType('SEMESTRAL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'SEMESTRAL' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>Semestral</button>
                        <button onClick={() => setReportType('LIQUIDATION')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'LIQUIDATION' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}>Liquidation</button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Semester</label>
                    <div className="relative">
                        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                            <option>First Semester</option>
                            <option>Second Semester</option>
                            <option>Summer Term</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">School Year</label>
                    <div className="relative">
                        <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 pl-4 pr-10 py-3 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                            {schoolYearOptions.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="flex-1 text-right">
                    <button onClick={reportType === 'SEMESTRAL' ? generateSemestralReport : generateLiquidationReport} disabled={loading || filteredData.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 ml-auto shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={20} /> Generate PDF
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Preview Data</h3>
                </div>
                {filteredData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Date</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Type</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Description</th>
                                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.slice(0, 5).map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{new Date(t.transaction_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${t.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{t.payee_merchant || t.description}</p>
                                            <p className="text-xs text-slate-500">{t.category || t.source_name}</p>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold text-sm ${t.type === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'INFLOW' ? '+' : '-'} {Number(t.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                        <FileText size={48} className="mb-2 opacity-20" />
                        <p>No records found for this period.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;
