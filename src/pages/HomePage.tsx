import { useState, useEffect } from 'react';
import {
    User, ClipboardList, ShieldCheck, History,
    Users, BarChart3, Newspaper, BellRing, ChevronRight,
    CheckCircle, XCircle, Medal, Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

// --- Types ตาม API ใหม่ ---
interface ClassroomSummary {
    className: string;
    summary: {
        total: number;
        passed: number;
        failed: number;
        shield: number;
        certificate: number;
    };
}

export default function HomePage() {
    const [user, setUser] = useState<any>(null);
    const [summaryData, setSummaryData] = useState<ClassroomSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // 1. ดึงข้อมูลผู้ใช้งานปัจจุบัน
            const userRes = await api.get('/users/me');
            setUser(userRes.data);

            // 2. หากเป็นครู ให้ดึงข้อมูลสรุปพฤติกรรมห้องเรียนที่ปรึกษา
            if (userRes.data.role === 'TEACHER' && userRes.data.advisingClasses?.length > 0) {
                const classroomId = userRes.data.advisingClasses[0].id;
                const summaryRes = await api.get(`/summary/classroom/${classroomId}`);
                setSummaryData(summaryRes.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
    }

    // กำหนดเมนูลัดตาม Role
    const quickMenus = [
        { label: 'โปรไฟล์', icon: User, path: '/profile', color: 'bg-blue-50 text-blue-600' },
        { label: 'คะแนนพฤติกรรม', icon: ShieldCheck, path: '/behavior', color: 'bg-green-50 text-green-600' },
        { label: 'ประวัติเช็คชื่อ', icon: History, path: '/history', color: 'bg-purple-50 text-purple-600' },
        { label: 'ประกาศ/ข่าว', icon: Newspaper, path: '/news', color: 'bg-orange-50 text-orange-600' },
    ];

    // เมนูเพิ่มเติมสำหรับคุณครู
    const teacherMenus = [
        { label: 'เช็คชื่อวันนี้', icon: ClipboardList, path: '/attendance', color: 'bg-red-50 text-red-600' },
        { label: 'รายชื่อนักเรียน', icon: Users, path: '/student-list', color: 'bg-indigo-50 text-indigo-600' },
        { label: 'สถิติห้องเรียน', icon: BarChart3, path: '/stats', color: 'bg-teal-50 text-teal-600' },
        { label: 'แจ้งเตือน', icon: BellRing, path: '/notify', color: 'bg-pink-50 text-pink-600' },
    ];

    return (
        <div className="pb-24 bg-gray-50 min-h-screen">
            {/* Header Section */}
            <div className="bg-primary pt-12 pb-28 px-6 rounded-b-[40px] shadow-md relative z-0">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-primary-light text-sm font-medium">ยินดีต้อนรับสู่ DSPS Care</p>
                        <h1 className="text-white text-xl font-bold mt-1">โรงเรียนเทพศิรินทร์พุแค</h1>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                        <BellRing className="text-white" size={24} />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 -mt-16 space-y-6 relative z-10">

                {/* Teacher Dashboard (แสดงเฉพาะครู และเมื่อมีข้อมูล) */}
                {user?.role === 'TEACHER' && summaryData && (
                    <div className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <BarChart3 size={20} className="text-primary" /> สรุปพฤติกรรมห้อง {summaryData.className}
                            </h2>
                            <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">ภาพรวม</span>
                        </div>

                        {/* จำนวนนักเรียนรวม */}
                        <div className="mb-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100">
                            <span className="text-sm font-bold text-gray-600">นักเรียนทั้งหมดในห้อง</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-gray-800">{summaryData.summary.total}</span>
                                <span className="text-xs text-gray-500 font-medium">คน</span>
                            </div>
                        </div>

                        {/* Grid 4 สถานะ */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* ผ่านเกณฑ์ */}
                            <div className="p-3 bg-green-50/50 rounded-2xl border border-green-100 flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-600 rounded-xl"><CheckCircle size={18} strokeWidth={2.5} /></div>
                                <div>
                                    <p className="text-[10px] text-green-600 font-bold mb-0.5">ผ่านเกณฑ์</p>
                                    <p className="text-lg font-black text-green-700 leading-none">{summaryData.summary.passed}</p>
                                </div>
                            </div>

                            {/* ไม่ผ่านเกณฑ์ */}
                            <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100 flex items-center gap-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-xl"><XCircle size={18} strokeWidth={2.5} /></div>
                                <div>
                                    <p className="text-[10px] text-red-600 font-bold mb-0.5">ต้องปรับปรุง</p>
                                    <p className="text-lg font-black text-red-700 leading-none">{summaryData.summary.failed}</p>
                                </div>
                            </div>

                            {/* เกียรติบัตร */}
                            <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Medal size={18} strokeWidth={2.5} /></div>
                                <div>
                                    <p className="text-[10px] text-blue-600 font-bold mb-0.5">เกียรติบัตร</p>
                                    <p className="text-lg font-black text-blue-700 leading-none">{summaryData.summary.certificate}</p>
                                </div>
                            </div>

                            {/* โล่รางวัล */}
                            <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Trophy size={18} strokeWidth={2.5} /></div>
                                <div>
                                    <p className="text-[10px] text-purple-600 font-bold mb-0.5">โล่รางวัล</p>
                                    <p className="text-lg font-black text-purple-700 leading-none">{summaryData.summary.shield}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student / Parent Welcome Card */}
                {(user?.role === 'STUDENT' || user?.role === 'PARENT') && (
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <Users size={32} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">สวัสดีคุณ {user?.firstName}</h2>
                                <p className="text-gray-500 text-xs mt-0.5">ขอให้เป็นวันที่ดีสำหรับการเรียนรู้นะครับ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Menus Grid */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-800 px-1 text-sm">เมนูลัด</h3>
                    <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                        {(user?.role === 'TEACHER' ? [...teacherMenus, ...quickMenus] : quickMenus).slice(0, 8).map((menu, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform">
                                <div className={`w-14 h-14 ${menu.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                                    <menu.icon size={24} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight whitespace-nowrap">
                                    {menu.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Banner / Promotion */}
                <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-5 text-white flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform cursor-pointer">
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm">คู่มือการใช้งานระบบ</h4>
                        <p className="text-[10px] text-primary-light">เรียนรู้ฟีเจอร์ต่าง ๆ ของ DSPS Care</p>
                    </div>
                    <ChevronRight size={24} className="bg-white/20 rounded-full p-1" />
                </div>

            </div>
        </div>
    );
}
