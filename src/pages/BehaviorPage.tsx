import { useState, useEffect, Fragment, useMemo, type SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';
import {
    ShieldCheck, Search, ChevronRight, X,
    TrendingDown, TrendingUp, AlertTriangle, Medal, Trophy, CheckCircle2
} from 'lucide-react';

// --- Types ---
interface StudentSummary {
    id: string;
    citizenId: string;
    name: string;
    score: number;
    status: 'NORMAL' | 'FAILED' | 'CERTIFICATE' | 'SHIELD';
}

interface ClassroomStudent {
    id: string;
    citizenId: string;
}

interface ParentChild {
    id: string;
    citizenId: string;
    firstName: string;
    lastName: string;
    classroom?: { name: string } | null;
}

interface ClassroomSummary {
    className: string;
    summary: Record<string, unknown>;
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
    const [parentStudents, setParentStudents] = useState<ParentChild[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // States สำหรับข้อมูลรายบุคคล
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    async function openStudentDetail(studentId: string) {
        try {
            setDetailLoading(true);
            setIsDetailOpen(true);
            const res = await api.get(`/summary/student/${studentId}`);
            setStudentDetail(res.data);
        } catch {
            toast.error('โหลดข้อมูลนักเรียนล้มเหลว');
            setIsDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    }

    useEffect(() => {
        const loadPage = async () => {
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
                    const [summaryRes, studentsRes] = await Promise.all([
                        api.get<ClassroomSummary>(`/summary/classroom/${classroomId}`),
                        api.get<ClassroomStudent[]>(`/students?classroomId=${classroomId}`),
                    ]);
                    const citizenIds = new Map(
                        studentsRes.data.map(student => [student.id, student.citizenId]),
                    );
                    setClassroomData({
                        ...summaryRes.data,
                        students: summaryRes.data.students.map(student => ({
                            ...student,
                            citizenId: citizenIds.get(student.id) ?? '',
                        })),
                    });
                } else if (role === 'STUDENT') {
                    await openStudentDetail(userRes.data.id);
                } else if (role === 'PARENT') {
                    const children = sortStudents((userRes.data.children ?? []) as ParentChild[]);
                    setParentStudents(children);

                    if (children.length === 1) {
                        await openStudentDetail(children[0].id);
                    } else if (children.length === 0) {
                        toast.error('ไม่พบนักเรียนในความดูแล');
                    }
                }
            } catch {
                toast.error('ไม่สามารถโหลดข้อมูลได้');
            } finally {
                setLoading(false);
            }
        };

        void loadPage();
    }, []);

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
        return sortStudents(classroomData.students.filter(s =>
            `${s.name} ${s.citizenId}`.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    }, [classroomData, searchQuery]);

    const filteredParentStudents = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return parentStudents;
        return parentStudents.filter(student =>
            `${student.firstName} ${student.lastName} ${student.citizenId}`.toLowerCase().includes(query),
        );
    }, [parentStudents, searchQuery]);

    const closeDetail = () => {
        if (userRole === 'TEACHER' || (userRole === 'PARENT' && parentStudents.length > 1)) {
            setIsDetailOpen(false);
            return;
        }

        navigate('/');
    };

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
                                            <p className="mb-1.5 text-[10px] font-mono text-gray-400">รหัส: {student.citizenId}</p>
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

            {userRole === 'PARENT' && parentStudents.length > 1 && (
                <>
                    <div className="bg-primary px-6 pt-10 pb-6 shadow-md sticky top-0 z-10 lg:static lg:px-10 lg:pt-9 lg:pb-8">
                        <div className="lg:max-w-6xl lg:mx-auto">
                            <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2 mb-1">
                                <ShieldCheck size={24} /> คะแนนพฤติกรรม
                            </h1>
                            <p className="mb-5 text-xs text-primary-light">เลือกนักเรียนในความดูแล</p>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อ นามสกุล หรือรหัสนักเรียน"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-light text-sm shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-6 lg:max-w-6xl lg:mx-auto lg:px-10">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="font-bold text-gray-700">นักเรียนในความดูแล</h2>
                            <span className="text-xs text-gray-500">{filteredParentStudents.length} คน</span>
                        </div>

                        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                            {filteredParentStudents.map((student, index) => (
                                <button
                                    key={student.id}
                                    onClick={() => openStudentDetail(student.id)}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-gray-800">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            รหัส {student.citizenId || '-'}
                                            {student.classroom?.name ? ` · ห้อง ${student.classroom.name}` : ''}
                                        </p>
                                    </div>
                                    <ChevronRight className="text-gray-300" size={20} />
                                </button>
                            ))}

                            {filteredParentStudents.length === 0 && (
                                <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 lg:col-span-2">
                                    ไม่พบรายชื่อนักเรียน
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {userRole === 'PARENT' && parentStudents.length === 0 && (
                <div className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-gray-500">
                    ไม่พบนักเรียนในความดูแล
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal: รายละเอียดนักเรียน (Popup ตรงกลางจอ) */}
            {/* ------------------------------------------------------------- */}
            <Transition appear show={isDetailOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => {
                    closeDetail();
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
                                                    onClick={closeDetail}
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
interface HistoryIconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

function HistoryIcon({ size = 24, ...props }: HistoryIconProps) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
