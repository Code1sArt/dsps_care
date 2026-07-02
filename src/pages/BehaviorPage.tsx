import { useState, useEffect, Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { api } from '../lib/api';
import {
    ShieldCheck, Search, ChevronRight, X,
    TrendingDown, TrendingUp, AlertTriangle, Medal, Trophy, CheckCircle2
} from 'lucide-react';

// --- Types ---
interface StudentSummary {
    id: string;
    name: string;
    score: number;
    status: 'NORMAL' | 'FAILED' | 'CERTIFICATE' | 'SHIELD';
}

interface ClassroomSummary {
    className: string;
    summary: any;
    students: StudentSummary[];
}

interface HistoryItem {
    id: string;
    points: number;
    note: string;
    createdAt: string;
    category: {
        name: string;
        type: 'ADD' | 'DEDUCT';
    };
}

interface StudentDetail {
    studentId: string;
    name: string;
    scoreInfo: {
        currentScore: number;
        startingPoints: number;
        status: string;
    };
    history: HistoryItem[];
}

export default function BehaviorPage() {
    const navigate = useNavigate();

    // States สำหรับข้อมูลทั้งห้อง (มุมมองครู)
    const [userRole, setUserRole] = useState('');
    const [classroomData, setClassroomData] = useState<ClassroomSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // States สำหรับข้อมูลรายบุคคล
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const userRes = await api.get('/users/me');
            const role = userRes.data.role;
            setUserRole(role);

            if (role === 'TEACHER') {
                if (!userRes.data.advisingClasses || userRes.data.advisingClasses.length === 0) {
                    toast.error('ไม่พบห้องเรียนที่ปรึกษา');
                    return;
                }
                const classroomId = userRes.data.advisingClasses[0].id;
                const res = await api.get(`/summary/classroom/${classroomId}`);
                setClassroomData(res.data);
            } else if (role === 'STUDENT' || role === 'PARENT') {
                const targetId = role === 'STUDENT' ? userRes.data.id : userRes.data.children[0]?.id;
                if (targetId) {
                    await openStudentDetail(targetId);
                    setIsDetailOpen(true);
                }
            }
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    const openStudentDetail = async (studentId: string) => {
        try {
            setDetailLoading(true);
            setIsDetailOpen(true);
            const res = await api.get(`/summary/student/${studentId}`);
            setStudentDetail(res.data);
        } catch (error) {
            toast.error('โหลดข้อมูลนักเรียนล้มเหลว');
            setIsDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    // Helper function สำหรับสีและไอคอนตามสถานะ
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'FAILED': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'ต้องปรับปรุง', icon: AlertTriangle };
            case 'CERTIFICATE': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'เกียรติบัตร', icon: Medal };
            case 'SHIELD': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'โล่รางวัล', icon: Trophy };
            default: return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'ผ่านเกณฑ์', icon: CheckCircle2 };
        }
    };

    // ฟอร์แมตวันที่แบบไทย
    const formatDateTime = (dateString: string) => {
        return new Intl.DateTimeFormat('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(dateString));
    };

    // กรองรายชื่อนักเรียนจากการค้นหา
    const filteredStudents = useMemo(() => {
        if (!classroomData) return [];
        return classroomData.students.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classroomData, searchQuery]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 relative">

            {/* ------------------------------------------------------------- */}
            {/* มุมมองครู: รายชื่อนักเรียนในห้อง */}
            {/* ------------------------------------------------------------- */}
            {userRole === 'TEACHER' && classroomData && (
                <>
                    <div className="bg-primary px-6 pt-10 pb-6 rounded-b-[30px] shadow-md sticky top-0 z-10 lg:static lg:px-10 lg:pt-9 lg:pb-8 lg:rounded-b-[40px]">
                        <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2 mb-4 lg:max-w-6xl lg:mx-auto">
                            <ShieldCheck size={24} /> คะแนนพฤติกรรม
                        </h1>

                        {/* Search Bar */}
                        <div className="relative lg:max-w-6xl lg:mx-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหารายชื่อนักเรียน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/95 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-light text-sm shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="px-4 py-6 lg:max-w-6xl lg:mx-auto lg:px-10">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="font-bold text-gray-700">ห้อง {classroomData.className}</h2>
                            <span className="text-xs text-gray-500 font-medium">ทั้งหมด {classroomData.students.length} คน</span>
                        </div>

                        <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                            {filteredStudents.map((student) => {
                                const conf = getStatusConfig(student.status);
                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => openStudentDetail(student.id)}
                                        className={`w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border ${conf.border} active:scale-[0.98] transition-transform text-left`}
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm mb-1">{student.name}</p>
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${conf.bg} ${conf.color}`}>
                                                <conf.icon size={12} strokeWidth={2.5} />
                                                <span className="text-[10px] font-bold">{conf.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-xl font-black ${conf.color}`}>{student.score}</span>
                                                <span className="text-[9px] text-gray-400 uppercase font-bold">คะแนน</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300" />
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">ไม่พบรายชื่อนักเรียนที่ค้นหา</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal: รายละเอียดนักเรียน (Popup ตรงกลางจอ) */}
            {/* ------------------------------------------------------------- */}
            <Transition appear show={isDetailOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => {
                    if (userRole === 'TEACHER') setIsDetailOpen(false);
                    else navigate('/');
                }}>
                    {/* Background Overlay */}
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    {/* Popup Container */}
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">

                                <Dialog.Panel className="w-full max-w-sm lg:max-w-lg transform overflow-hidden rounded-[28px] bg-gray-50 text-left align-middle shadow-2xl transition-all">

                                    {detailLoading || !studentDetail ? (
                                        <div className="flex h-64 items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                                    ) : (
                                        <>
                                            {/* Header ของ Popup */}
                                            <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 relative z-10">
                                                <Dialog.Title as="h3" className="text-lg font-bold text-gray-800">
                                                    รายละเอียดพฤติกรรม
                                                </Dialog.Title>
                                                <button
                                                    onClick={() => userRole === 'TEACHER' ? setIsDetailOpen(false) : navigate('/')}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full active:scale-95 transition-all"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            {/* พื้นที่เนื้อหาที่สามารถเลื่อนได้ (Scrollable Content) */}
                                            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-5">

                                                {/* Card สรุปคะแนน */}
                                                {(() => {
                                                    const conf = getStatusConfig(studentDetail.scoreInfo.status);
                                                    return (
                                                        <div className={`p-5 rounded-2xl border ${conf.bg} ${conf.border} shadow-sm relative overflow-hidden`}>
                                                            <conf.icon size={100} className={`absolute -bottom-4 -right-4 opacity-10 ${conf.color}`} />

                                                            <h3 className="font-bold text-gray-800 text-base mb-1.5 relative z-10 pr-8">{studentDetail.name}</h3>
                                                            <div className="flex items-center gap-1.5 mb-4 relative z-10">
                                                                <span className={`px-2 py-0.5 bg-white rounded-md text-[10px] font-bold shadow-sm ${conf.color} flex items-center gap-1`}>
                                                                    <conf.icon size={12} /> {conf.label}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-end justify-between relative z-10">
                                                                <div>
                                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">คะแนนคงเหลือ</p>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={`text-4xl font-black ${conf.color} leading-none`}>{studentDetail.scoreInfo.currentScore}</span>
                                                                        <span className="text-xs text-gray-500 font-bold">/ {studentDetail.scoreInfo.startingPoints}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* ประวัติการทำรายการ */}
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm mb-3 px-1 flex items-center gap-1.5">
                                                        <HistoryIcon size={16} className="text-primary" /> ประวัติการทำรายการ
                                                    </h3>

                                                    {studentDetail.history.length === 0 ? (
                                                        <div className="bg-white p-6 rounded-2xl text-center text-gray-400 border border-gray-100 border-dashed">
                                                            <ShieldCheck size={28} className="mx-auto mb-2 opacity-50" />
                                                            <p className="text-[11px] font-medium">ยังไม่มีประวัติการหัก/เพิ่มคะแนน</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2.5">
                                                            {studentDetail.history.map((item) => {
                                                                const isDeduct = item.category.type === 'DEDUCT';
                                                                return (
                                                                    <div key={item.id} className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 flex gap-3 items-start">
                                                                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-0.5 ${isDeduct ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                                            {isDeduct ? <TrendingDown size={16} strokeWidth={2.5} /> : <TrendingUp size={16} strokeWidth={2.5} />}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                                                <p className="font-bold text-gray-800 text-xs leading-tight">{item.category.name}</p>
                                                                                <span className={`font-black text-xs whitespace-nowrap ${isDeduct ? 'text-red-500' : 'text-green-500'}`}>
                                                                                    {isDeduct ? '-' : '+'}{item.points}
                                                                                </span>
                                                                            </div>
                                                                            {item.note && (
                                                                                <p className="text-[10px] text-gray-500 mb-2 leading-relaxed bg-gray-50 p-1.5 rounded-lg">{item.note}</p>
                                                                            )}
                                                                            <p className="text-[9px] text-gray-400 font-mono">{formatDateTime(item.createdAt)}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

        </div>
    );
}

// ขอยืมตัวแปรไอคอนมาใช้นิดนึงครับ
function HistoryIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
