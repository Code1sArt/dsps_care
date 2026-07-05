import { useState, useEffect, Fragment } from 'react';
import {
    User, Lock, Eye, EyeOff, LogIn,
    UserPlus, ChevronsUpDown, Check, ArrowLeft
} from 'lucide-react';
import { Combobox, Transition } from '@headlessui/react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface BindingPageProps {
    lineUserId: string;
    onBindSuccess: (token: string, user: unknown) => void;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    citizenId: string;
}

export default function BindingPage({ lineUserId, onBindSuccess }: BindingPageProps) {
    // --- โหมดการแสดงผล (Login หรือ Register) ---
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- State สำหรับหน้า ผูกบัญชี (Login) ---
    const [citizenId, setCitizenId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // --- State สำหรับหน้า ลงทะเบียนผู้ปกครอง (Register) ---
    const [regForm, setRegForm] = useState({
        citizenId: '',
        firstName: '',
        lastName: '',
        password: ''
    });
    const [showRegPassword, setShowRegPassword] = useState(false);

    // State สำหรับค้นหานักเรียน (Combobox)
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentQuery, setStudentQuery] = useState('');
    const [studentsLoading, setStudentsLoading] = useState(false);

    // โหลด 30 คนแรกเมื่อเปิดรายการ และค้นหาจาก API เมื่อผู้ใช้พิมพ์
    useEffect(() => {
        if (!isRegisterMode) return;

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                setStudentsLoading(true);
                const res = await api.get<Student[]>('/students/search', {
                    params: { q: studentQuery.trim(), limit: 30 },
                    signal: controller.signal,
                });
                setStudents(res.data);
            } catch {
                if (!controller.signal.aborted) {
                    setStudents([]);
                    toast.error('ไม่สามารถโหลดรายชื่อนักเรียนได้');
                }
            } finally {
                if (!controller.signal.aborted) setStudentsLoading(false);
            }
        }, studentQuery ? 300 : 0);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [isRegisterMode, studentQuery]);

    // ==========================================
    // ฟังก์ชัน: ยืนยันการผูกบัญชี (เข้าสู่ระบบ)
    // ==========================================
    const handleBindAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!citizenId || !password) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');

        setLoading(true);
        const toastId = toast.loading('กำลังตรวจสอบข้อมูล...');

        try {
            const res = await api.post('/auth/bind-line', {
                citizenId, password, lineUserId
            });
            toast.success('เชื่อมต่อบัญชีสำเร็จ!', { id: toastId });
            onBindSuccess(res.data.access_token, res.data.user);
        } catch (error: unknown) {
            const message = error instanceof AxiosError ? error.response?.data?.message : null;
            toast.error(message || 'รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // ฟังก์ชัน: สมัครสมาชิกสำหรับผู้ปกครองใหม่
    // ==========================================
    const handleRegisterParent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return toast.error('กรุณาเลือกนักเรียนในความดูแล');
        if (regForm.citizenId.length !== 13) return toast.error('รหัสประชาชนต้องมี 13 หลัก');

        setLoading(true);
        const toastId = toast.loading('กำลังลงทะเบียน...');

        try {
            await api.post('/parents/register', {
                ...regForm,
                studentCitizenId: selectedStudent.citizenId,
                lineUserId: lineUserId // ส่ง LINE ID ไปผูกตอนลงทะเบียนเลย
            });

            toast.success('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ', { id: toastId });

            // ล้างค่าและสลับกลับไปหน้า Login
            setRegForm({ citizenId: '', firstName: '', lastName: '', password: '' });
            setSelectedStudent(null);
            setIsRegisterMode(false);

            // เติมรหัสประชาชนให้ในช่อง Login เพื่อความสะดวก
            setCitizenId(regForm.citizenId);

        } catch (error: unknown) {
            const message = error instanceof AxiosError ? error.response?.data?.message : null;
            toast.error(message || 'เกิดข้อผิดพลาดในการลงทะเบียน', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-y-auto">

            {/* Background Decoration */}
            <div className="pointer-events-none fixed -left-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl"></div>
            <div className="pointer-events-none fixed -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
            <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:22px_22px]"></div>

            <div className="z-10 my-5 w-full max-w-sm overflow-visible rounded-[32px] border border-white/20 bg-white shadow-2xl shadow-black/25 lg:max-w-md">

                {/* --- สลับ Header ตามโหมด --- */}
                <div className="relative flex flex-col items-center overflow-hidden rounded-t-[31px] bg-gradient-to-b from-white to-blue-50 px-7 pb-7 pt-8 text-center">
                    <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/15"></div>
                    <div className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-primary/5"></div>
                    {isRegisterMode && (
                        <button
                            type="button"
                            onClick={() => setIsRegisterMode(false)}
                            className="absolute left-5 top-5 z-10 rounded-xl bg-white p-2 text-gray-500 shadow-sm ring-1 ring-gray-100 transition-colors hover:text-primary"
                            aria-label="กลับไปหน้าเชื่อมต่อบัญชี"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="relative mb-4 flex h-28 w-28 items-center justify-center rounded-3xl bg-white p-2 shadow-lg shadow-primary/10 ring-1 ring-primary/5">
                        <img
                            src="/school-logo.png"
                            alt="ตราโรงเรียนเทพศิรินทร์พุแค สระบุรี"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <p className="relative text-xs font-black uppercase tracking-[0.22em] text-primary">DSPS Care</p>
                    <h1 className="relative mt-2 text-xl font-black text-gray-800">
                        {isRegisterMode ? 'ลงทะเบียนผู้ปกครอง' : 'เชื่อมต่อบัญชี'}
                    </h1>
                    <p className="relative mt-2 text-xs text-gray-500">
                        {isRegisterMode ? 'สร้างบัญชีเพื่อติดตามข้อมูลบุตรหลาน' : 'กรุณายืนยันตัวตนเพื่อเข้าใช้งานระบบ'}
                    </p>
                    <div className="relative mt-4 h-px w-12 bg-accent"></div>
                    <p className="relative mt-3 max-w-xs text-[11px] font-semibold leading-relaxed text-primary">
                        โรงเรียนเทพศิรินทร์พุแค สระบุรี<br />
                        <span className="text-gray-500">ที่แห่งนี้ดูแลเหมือนครอบครัว</span>
                    </p>
                </div>

                <div className="rounded-b-[31px] bg-white p-7 lg:p-8">
                {/* ========================================= */}
                {/* ฟอร์มเข้าสู่ระบบ (สำหรับคนมีบัญชีแล้ว) */}
                {/* ========================================= */}
                {!isRegisterMode ? (
                    <form onSubmit={handleBindAccount} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 ml-1">รหัสประจำตัว (13 หลัก)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-gray-400" /></div>
                                <input required type="text" inputMode="numeric" autoComplete="username" maxLength={13} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" placeholder="กรอกรหัสประจำตัว" value={citizenId} onChange={(e) => setCitizenId(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 ml-1">รหัสผ่าน</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={16} className="text-gray-400" /></div>
                                <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" placeholder="กรอกรหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn size={18} /> ยืนยันการผูกบัญชี</>}
                        </button>

                        {/* ปุ่มสลับไปหน้าลงทะเบียน */}
                        <div className="pt-4 mt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-500 mb-2">ผู้ปกครองที่ยังไม่มีบัญชี?</p>
                            <button type="button" onClick={() => setIsRegisterMode(true)} className="w-full rounded-xl border border-primary/10 bg-primary/5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
                                ลงทะเบียนผู้ปกครองใหม่
                            </button>
                        </div>
                    </form>

                ) : (

                    /* ========================================= */
                    /* ฟอร์มลงทะเบียน (สำหรับผู้ปกครองใหม่) */
                    /* ========================================= */
                    <form onSubmit={handleRegisterParent} className="space-y-4">

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 ml-1">รหัสประชาชน (13 หลัก)</label>
                            <input required type="text" maxLength={13} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={regForm.citizenId} onChange={(e) => setRegForm({ ...regForm, citizenId: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 ml-1">ชื่อ</label>
                                <input required type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={regForm.firstName} onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700 ml-1">นามสกุล</label>
                                <input required type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={regForm.lastName} onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1 relative z-50">
                            <label className="text-xs font-bold text-gray-700 ml-1">นักเรียนในความดูแล</label>
                            <Combobox value={selectedStudent} onChange={setSelectedStudent}>
                                <div className="relative w-full">
                                    <Combobox.Input
                                        required
                                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        displayValue={(student: Student) => student ? `${student.firstName} ${student.lastName}` : ''}
                                        onChange={(e) => setStudentQuery(e.target.value)}
                                        placeholder="พิมพ์ชื่อเพื่อค้นหานักเรียน..."
                                    />
                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        <ChevronsUpDown size={16} className="text-gray-400" aria-hidden="true" />
                                    </Combobox.Button>
                                </div>
                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setStudentQuery('')}>
                                    <Combobox.Options className="absolute mt-1 max-h-48 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-100">
                                        {studentsLoading ? (
                                            <div className="relative cursor-default select-none py-3 px-4 text-gray-500 text-xs">
                                                กำลังโหลดรายชื่อนักเรียน...
                                            </div>
                                        ) : students.length === 0 ? (
                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-500 text-xs">ไม่พบข้อมูลนักเรียน</div>
                                        ) : (
                                            students.map((student) => (
                                                <Combobox.Option key={student.id} className={({ active }) => `relative cursor-default select-none py-2.5 pl-10 pr-4 ${active ? 'bg-primary/10 text-primary' : 'text-gray-700'}`} value={student}>
                                                    {({ selected, active }) => (
                                                        <>
                                                            <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>{student.firstName} {student.lastName} <span className="text-[10px] text-gray-400">({student.citizenId})</span></span>
                                                            {selected ? <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-primary' : 'text-primary'}`}><Check size={16} /></span> : null}
                                                        </>
                                                    )}
                                                </Combobox.Option>
                                            ))
                                        )}
                                    </Combobox.Options>
                                </Transition>
                            </Combobox>
                        </div>

                        <div className="space-y-1 relative z-0">
                            <label className="text-xs font-bold text-gray-700 ml-1">ตั้งรหัสผ่านสำหรับเข้าสู่ระบบ</label>
                            <div className="relative">
                                <input required type={showRegPassword ? 'text' : 'password'} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
                                <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 mt-4">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><UserPlus size={18} /> ลงทะเบียน</>}
                        </button>
                    </form>
                )}
                </div>

            </div>
            <p className="relative z-10 mb-2 text-center text-[10px] font-medium text-white/55">
                © DSPS Care · โรงเรียนเทพศิรินทร์พุแค สระบุรี
            </p>
        </div>
    );
}
