import { useState, useEffect, Fragment } from 'react';
import {
    ShieldCheck, User, Lock, Eye, EyeOff, LogIn,
    UserPlus, ChevronsUpDown, Check, ArrowLeft
} from 'lucide-react';
import { Combobox, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface BindingPageProps {
    lineUserId: string;
    onBindSuccess: (token: string, user: any) => void;
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

    // ดึงรายชื่อนักเรียนเมื่อสลับมาหน้าลงทะเบียน
    useEffect(() => {
        if (isRegisterMode && students.length === 0) {
            fetchStudents();
        }
    }, [isRegisterMode]);

    const fetchStudents = async () => {
        try {
            // 🚨 สมมติว่ามี API เส้นนี้สำหรับดึงรายชื่อนักเรียนทั้งหมด
            const res = await api.get('/students');
            setStudents(res.data);
        } catch (error) {
            toast.error('ไม่สามารถโหลดรายชื่อนักเรียนได้');
        }
    };

    // ตัวกรองนักเรียนตามที่พิมพ์ค้นหา
    const filteredStudents = studentQuery === ''
        ? students
        : students.filter((s) =>
            `${s.firstName} ${s.lastName} ${s.citizenId}`.toLowerCase().includes(studentQuery.toLowerCase())
        );

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
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง', { id: toastId });
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

        } catch (error: any) {
            toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-y-auto">

            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl fixed"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-accent/20 rounded-full blur-3xl fixed"></div>

            <div className="w-full max-w-sm lg:max-w-md bg-white rounded-3xl shadow-xl p-8 lg:p-10 z-10 border border-gray-100 my-8">

                {/* --- สลับ Header ตามโหมด --- */}
                <div className="flex flex-col items-center text-center mb-6 relative">
                    {isRegisterMode && (
                        <button
                            onClick={() => setIsRegisterMode(false)}
                            className="absolute left-0 top-0 p-2 text-gray-400 hover:text-primary transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                        {isRegisterMode ? <UserPlus size={32} /> : <ShieldCheck size={36} strokeWidth={2.5} />}
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">
                        {isRegisterMode ? 'ลงทะเบียนผู้ปกครอง' : 'เชื่อมต่อบัญชี'}
                    </h1>
                    <p className="text-gray-500 text-xs mt-2">
                        {isRegisterMode ? 'สร้างบัญชีเพื่อติดตามข้อมูลบุตรหลาน' : 'กรุณายืนยันตัวตนเพื่อเข้าใช้งานระบบ'}<br />
                        <span className="font-semibold text-primary">โรงเรียนเทพศิรินทร์พุแค</span>
                    </p>
                </div>

                {/* ========================================= */}
                {/* ฟอร์มเข้าสู่ระบบ (สำหรับคนมีบัญชีแล้ว) */}
                {/* ========================================= */}
                {!isRegisterMode ? (
                    <form onSubmit={handleBindAccount} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 ml-1">รหัสประจำตัว (13 หลัก)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={16} className="text-gray-400" /></div>
                                <input required type="text" maxLength={13} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" placeholder="กรอกรหัสประจำตัว" value={citizenId} onChange={(e) => setCitizenId(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 ml-1">รหัสผ่าน</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={16} className="text-gray-400" /></div>
                                <input required type={showPassword ? 'text' : 'password'} className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" placeholder="กรอกรหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 mt-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><LogIn size={18} /> ยืนยันการผูกบัญชี</>}
                        </button>

                        {/* ปุ่มสลับไปหน้าลงทะเบียน */}
                        <div className="pt-4 mt-4 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-500 mb-2">ผู้ปกครองที่ยังไม่มีบัญชี?</p>
                            <button type="button" onClick={() => setIsRegisterMode(true)} className="w-full py-2.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl font-bold text-sm transition-colors border border-primary/10">
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
                                        {filteredStudents.length === 0 ? (
                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-500 text-xs">ไม่พบข้อมูลนักเรียน</div>
                                        ) : (
                                            filteredStudents.map((student) => (
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
    );
}
