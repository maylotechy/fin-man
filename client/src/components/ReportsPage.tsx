// @ts-ignore
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// @ts-ignore
import usmLogo from '../assets/usm-logo.png'; // Reverted specific retina logo to standard one

// Updated Image Loader to use fetch -> Blob for better CORS handling
const getBase64ImageFromURL = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url, {
            mode: 'cors', // Ensure CORS is requested
        });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Base64 conversion failed", error);
        throw error;
    }
};

const addHeader = (doc: any) => {
    const USM_GREEN = '#006838';
    doc.addImage(usmLogo, 'PNG', 25, 10, 20, 20); // Logo Left

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(USM_GREEN);
    doc.text("UNIVERSITY OF SOUTHERN MINDANAO", 105, 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text("Kabacan, Cotabato, Philippines", 105, 16, { align: "center" });
    doc.text("Office of Student Affairs", 105, 20, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT DEVELOPMENT SERVICES", 105, 24, { align: "center" });
};

const addFooter = (doc: any) => {
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    // Updated footer to be Lower Left aligned
    doc.text("USM-OSA-F46-Rev.0.2025.05.05", 14, pageHeight - 10, { align: "left" });
};

const ReportsPage = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [reportType, setReportType] = useState<'SEMESTRAL' | 'LIQUIDATION'>('SEMESTRAL');
    const [organizationType, setOrganizationType] = useState('');
    const [officers, setOfficers] = useState({
        treasurer: ' ',
        auditor: ' ',
        president: ' ',
        adviser: ' ',
        adviser2: ''
    });
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
                    setOrganizationType(settingsRes.data.organization_type || 'Student Organization');
                    setOfficers({
                        treasurer: settingsRes.data.treasurer_name || ' ',
                        auditor: settingsRes.data.auditor_name || ' ',
                        president: settingsRes.data.president_name || ' ',
                        adviser: settingsRes.data.adviser_name || ' ',
                        adviser2: settingsRes.data.adviser2_name || ''
                    });
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
                head: [['Date', 'Payee', 'Particulars', 'Amount', 'Event', 'Fund', 'Att.', 'Legal Basis']],
                body: outflowData.map((t: any) => [
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.payee_merchant, t.description, `P ${Number(t.amount).toLocaleString()}`,
                    t.event_name || 'N/A', t.source_name || 'General',
                    t.evidence_number || 'OR', t.resolution_number || ''
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

    const generateLiquidationReport = async () => {
        const doc = new jsPDF();
        const orgName = "Philippine Society of Information Technology Students (USM-PSITS)";
        const data = filteredData;
        const outflowData = data.filter((t: any) => t.type === 'OUTFLOW');

        // Group by Event
        // @ts-ignore
        const events = [...new Set(outflowData.map((t: any) => t.event_name || 'General Expenses'))];

        try {
            toast.loading("Generating Liquidation Report...");

            for (let i = 0; i < events.length; i++) {
                const currentEvent = events[i];
                // @ts-ignore
                const eventTransactions = outflowData.filter((t: any) => (t.event_name || 'General Expenses') === currentEvent);

                if (i > 0) doc.addPage();

                // --- PAGE 1: FINANCIAL REPORT ---
                addHeader(doc);
                addFooter(doc);

                // Boxed Title
                doc.setDrawColor(0);
                doc.rect(14, 28, 182, 7);
                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text("LIQUIDATION REPORT", 105, 33, { align: "center" });

                // Event Specific Details
                const duration = eventTransactions.find((t: any) => t.duration)?.duration || 'N/A';
                const approvalDate = eventTransactions.find((t: any) => t.activity_approval_date)?.activity_approval_date
                    ? new Date(eventTransactions.find((t: any) => t.activity_approval_date)?.activity_approval_date).toLocaleDateString()
                    : 'N/A';
                const resolutionNum = eventTransactions.find((t: any) => t.resolution_number)?.resolution_number || 'N/A';
                // @ts-ignore
                const fundSources = [...new Set(eventTransactions.map((t: any) => t.source_name).filter(Boolean))].join(', ') || 'General Fund';
                // Budget is debatable - usually total inflow, but here maybe sum of expenses? Or allocated budget.
                // Using Total Inflow for the semester as "Budget Allocation" fallback, or sum of expenses if event specific.
                // Detailed logic: "Budget Allocation" usually refers to the specific budget for that event. If not tracked, use Total Expense + Balance?
                // For now, I'll use sum of expenses as 'Utilized Budget' or just keep the Total Semester Inflow if it's broad.
                // Let's use the sum of expenses for this event as "Total Validated Expenses" context.
                // Actually, let's keep it as Total Semester Budget for context, or just 'N/A' if not specific.
                // To be safe, I'll use "Total Inflows" as "Available Budget".
                const totalInflow = data.filter((t: any) => t.type === 'INFLOW').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);


                autoTable(doc, {
                    startY: 38,
                    theme: 'grid',
                    head: [
                        [
                            { content: `Name of Organization:\n${orgName}`, styles: { halign: 'left' } },
                            { content: `Type of Organization:\n${organizationType}`, styles: { halign: 'left' } },
                            { content: `Semester & School Year:\n${semester}, ${schoolYear}`, styles: { halign: 'left' } }
                        ],
                        [
                            { content: `Name of Activity/Project:\n${currentEvent}`, styles: { halign: 'left' } },
                            { content: `Duration/Date of Activity:\n${duration}`, styles: { halign: 'left' } },
                            { content: `Date of Approval of Activity Permit by OSA:\n${approvalDate}`, styles: { halign: 'left' } }
                        ],
                        [
                            { content: `Budget Allocation:\nP ${totalInflow.toLocaleString()}`, styles: { halign: 'left' } },
                            { content: `Fund Source:\n${fundSources}`, styles: { halign: 'left' } },
                            { content: `Resolution Number:\n${resolutionNum}`, styles: { halign: 'left' } }
                        ]
                    ],
                    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: 0 },
                    headStyles: { fillColor: 255, textColor: 0, fontStyle: 'bold' }
                });

                // @ts-ignore
                let finalY = doc.lastAutoTable.finalY + 5;

                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.text("Liquidation Report", 14, finalY);
                finalY += 4;
                doc.text("This liquidation report should be submitted to OSA a month after the completion of the activity.", 14, finalY);
                finalY += 5;

                // DETAILS TABLE
                const tableBody = eventTransactions.map((t: any, index: number) => [
                    index + 1,
                    t.category || 'Expense',
                    t.payee_merchant || t.description,
                    `P ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.evidence_number || 'OR',
                    ''
                ]);

                autoTable(doc, {
                    startY: finalY,
                    head: [['Item\nNo.', 'Nature', 'Payee/Merchant', 'Amount', 'Date', 'Evidence\nNo.', 'Remarks']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: 0, textColor: 255, halign: 'center', fontSize: 8 },
                    styles: { fontSize: 8, textColor: 0 },
                    foot: [['', 'TOTAL', '', `P ${eventTransactions.reduce((a: any, c: any) => a + Number(c.amount), 0).toLocaleString()}`, '', '', '']],
                    footStyles: { fillColor: 200, textColor: 0, fontStyle: 'bold', halign: 'right' }
                });

                addSignatories(doc);

                // --- PAGE 2...N: RECEIPTS ---
                // @ts-ignore
                const receipts = eventTransactions.filter(t => t.attachment_url);

                if (receipts.length > 0) {
                    doc.addPage();
                    addHeader(doc);
                    addFooter(doc);

                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.text(`ATTACHMENTS: ${currentEvent}`, 14, 35);

                    let yPos = 45;
                    for (const t of receipts) {
                        // Check if space is low
                        if (yPos > 200) {
                            doc.addPage();
                            addHeader(doc);
                            addFooter(doc);
                            yPos = 35;
                        }

                        try {
                            const isAbsolute = t.attachment_url.startsWith('http');
                            // Construct URL - Use as is if absolute (Cloudinary), else localhost
                            const imageUrl = isAbsolute
                                ? t.attachment_url
                                : `http://localhost:5000/uploads/${t.attachment_url.split(/[/\\]/).pop()}`;

                            const base64Img = await getBase64ImageFromURL(imageUrl);

                            doc.setFontSize(9);
                            doc.text(`Receipt for: ${t.payee_merchant} (P ${t.amount})`, 14, yPos);
                            yPos += 5;

                            // Maintain Aspect Ratio, Max Width 180, Max Height 100
                            const imgProps = doc.getImageProperties(base64Img);
                            const pdfWidth = 160;
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                            doc.addImage(base64Img, 'PNG', 14, yPos, pdfWidth, pdfHeight);
                            yPos += pdfHeight + 15;

                        } catch (imgErr) {
                            console.error("Failed to load image for PDF", imgErr);
                            doc.setFontSize(8);
                            doc.setTextColor(255, 0, 0);
                            doc.text(`[Image Load Failed: ${t.attachment_url}]`, 14, yPos);
                            doc.setTextColor(0);
                            yPos += 10;
                        }
                    }
                }
            }

            doc.save(`Liquidation_Report_${semester.replace(/\s/g, '_')}.pdf`);
            toast.dismiss(); toast.success("Liquidation Report Generated!");
        } catch (err) {
            console.error(err); toast.dismiss(); toast.error("Generate failed");
        }
    };

    const addSignatories = (doc: any) => {
        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text("We hereby attest to the correctness of this liquidation report.", 14, finalY);
        finalY += 5;

        autoTable(doc, {
            startY: finalY,
            theme: 'grid',
            head: [['Prepared by:', 'Audited by:', 'Submitted by:', 'Noted:', 'Noted:']],
            body: [
                ['\n\n\n', '\n\n\n', '\n\n\n', '\n\n\n', '\n\n\n'], // Space for signature
                [
                    officers.treasurer.toUpperCase(),
                    officers.auditor.toUpperCase(),
                    officers.president.toUpperCase(),
                    officers.adviser.toUpperCase(),
                    officers.adviser2 ? officers.adviser2.toUpperCase() : ''
                ],
                [
                    'Name and Signature of\nOrganization Treasurer',
                    'Name and Signature of\nOrganization Auditor',
                    'Name and Signature of\nOrganization Head',
                    'Name and Signature of\nAdviser',
                    'Name and Signature of\nAdviser'
                ]
            ],
            styles: {
                fontSize: 8,
                halign: 'center',
                valign: 'bottom',
                textColor: 0,
                cellPadding: 2,
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: 255,
                textColor: 0,
                fontStyle: 'normal',
                halign: 'left',
                valign: 'top',
                cellPadding: 1
            },
            columnStyles: {
                0: { cellWidth: 38 },
                1: { cellWidth: 38 },
                2: { cellWidth: 38 },
                3: { cellWidth: 38 },
                4: { cellWidth: 38 }
            },
            // Bold the names (Row index 1 of body, which differs from visual row because 'head' is separate)
            // Actually autoTable hooks are complex for cell specific styling.
            // I'll just set the whole table to normal, and maybe uppercase the names implies importance.
            // Or I can use `didParseCell` to bold specific rows.
            didParseCell: function (data) {
                if (data.section === 'body' && data.row.index === 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
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
