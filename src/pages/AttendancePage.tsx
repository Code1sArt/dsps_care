import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList, CheckCircle2, XCircle, Clock,
  CalendarDays, Flag, MapPin, Save, Users, Activity
} from 'lucide-react';

// --- Types ---
interface Student {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  classroom: { name: string };
}

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  advisingClasses?: Array<{ id: number; name: string }>;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  recorderId: string;
  status: AttendanceStatus;
  recorder: {
    firstName: string;
    lastName: string;
  };
}

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'ACTIVITY';
type AttendanceType = 'ASSEMBLY' | 'AREA';

const getTodayInThailand = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
};

export default function AttendancePage() {
  const navigate = useNavigate();

  // States
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [classroomId, setClassroomId] = useState<number | null>(null);

  // States สำหรับการเช็คชื่อ
  const [attendanceType, setAttendanceType] = useState<AttendanceType | null>(null);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [originalRecords, setOriginalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceRecordIds, setAttendanceRecordIds] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [checkingType, setCheckingType] = useState<AttendanceType | null>(null);

  // Modal State
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(true);

  async function fetchStudents() {
    try {
      setLoading(true);
      // 1. หาว่าครูคนนี้เป็นที่ปรึกษาห้องไหน
      const userRes = await api.get('/users/me');
      setCurrentUser(userRes.data);

      if (!userRes.data.advisingClasses || userRes.data.advisingClasses.length === 0) {
        toast.error('คุณไม่มีห้องเรียนประจำชั้น');
        navigate('/');
        return;
      }

      const advisingClassroomId = userRes.data.advisingClasses[0].id;
      setClassroomId(advisingClassroomId);
      setClassName(userRes.data.advisingClasses[0].name);

      // 2. ดึงรายชื่อนักเรียนในห้องนั้น
      const stuRes = await api.get(`/students?classroomId=${advisingClassroomId}`);
      const sortedStudents = sortStudents(stuRes.data as Student[]);
      setStudents(sortedStudents);

      // 3. ตั้งค่าเริ่มต้นให้ทุกคนเป็น PRESENT (มาเรียน) เพื่อความรวดเร็ว
      const initialRecords: Record<string, AttendanceStatus> = {};
      sortedStudents.forEach((s: Student) => {
        initialRecords[s.id] = 'PRESENT';
      });
      setRecords(initialRecords);

    } catch {
      toast.error('ไม่สามารถโหลดรายชื่อนักเรียนได้');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // โหลดข้อมูลครั้งเดียวเมื่อเปิดหน้า
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAttendanceType = async (type: AttendanceType) => {
    if (!currentUser || classroomId === null) return;

    try {
      setCheckingType(type);
      const historyRes = await api.get('/attendance/history/daily', {
        params: {
          date: getTodayInThailand(),
          classroomId,
          type,
        },
      });
      const todayRecords = (historyRes.data.records?.[type] ?? []) as AttendanceRecord[];

      if (todayRecords.length === 0) {
        setAttendanceType(type);
        setIsEditing(false);
        setOriginalRecords({});
        setAttendanceRecordIds({});
        setIsTypeModalOpen(false);
        return;
      }

      const foreignRecord = todayRecords.find(record => record.recorderId !== currentUser.id);
      if (foreignRecord) {
        const recorderName = `${foreignRecord.recorder.firstName} ${foreignRecord.recorder.lastName}`.trim();
        toast.error(`ครู ${recorderName} ได้เช็คชื่อของวันนี้ไปแล้ว`, { duration: 5000 });
        return;
      }

      const savedRecords: Record<string, AttendanceStatus> = {};
      const savedRecordIds: Record<string, string> = {};
      todayRecords.forEach(record => {
        savedRecords[record.studentId] = record.status;
        savedRecordIds[record.studentId] = record.id;
      });

      // รองรับกรณีมีนักเรียนเพิ่มเข้าห้องหลังจากบันทึกครั้งแรก
      students.forEach(student => {
        if (!savedRecords[student.id]) savedRecords[student.id] = 'PRESENT';
      });

      setRecords(savedRecords);
      setOriginalRecords(savedRecords);
      setAttendanceRecordIds(savedRecordIds);
      setAttendanceType(type);
      setIsEditing(true);
      setIsTypeModalOpen(false);
      toast.success('พบข้อมูลของวันนี้ คุณสามารถแก้ไขรายการเดิมได้');
    } catch {
      toast.error('ไม่สามารถตรวจสอบข้อมูลเช็คชื่อของวันนี้ได้');
    } finally {
      setCheckingType(null);
    }
  };

  // ฟังก์ชันเปลี่ยนสถานะรายคน
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
  };

  // 💡 ฟังก์ชันใหม่: เปลี่ยนสถานะทุกคนพร้อมกัน
  const handleMarkAll = (status: AttendanceStatus, label: string) => {
    const newRecords: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      newRecords[s.id] = status;
    });
    setRecords(newRecords);
    toast.success(`เปลี่ยนทุกคนเป็น "${label}" เรียบร้อย`);
  };

  // ฟังก์ชันบันทึกข้อมูล
  const handleSaveAttendance = async () => {
    if (!attendanceType) return toast.error('กรุณาเลือกประเภทการเช็คชื่อ');

    const toastId = toast.loading('กำลังบันทึกข้อมูล...');

    // จัดรูปแบบ JSON ส่งให้ API
    const payload = {
      type: attendanceType,
      records: Object.entries(records).map(([studentId, status]) => ({
        studentId,
        status
      }))
    };

    try {
      if (isEditing) {
        const changedRecords = Object.entries(records).filter(
          ([studentId, status]) =>
            attendanceRecordIds[studentId] && originalRecords[studentId] !== status,
        );
        const newRecords = Object.entries(records).filter(
          ([studentId]) => !attendanceRecordIds[studentId],
        );

        if (changedRecords.length === 0 && newRecords.length === 0) {
          toast.success('ข้อมูลไม่มีการเปลี่ยนแปลง', { id: toastId });
          return;
        }

        await Promise.all([
          ...changedRecords.map(([studentId, status]) =>
            api.patch(`/attendance/${attendanceRecordIds[studentId]}`, { status }),
          ),
          ...(newRecords.length > 0
            ? [api.post('/attendance/bulk', {
              type: attendanceType,
              records: newRecords.map(([studentId, status]) => ({ studentId, status })),
            })]
            : []),
        ]);
        toast.success('แก้ไขข้อมูลการเช็คชื่อสำเร็จ!', { id: toastId });
      } else {
        await api.post('/attendance/bulk', payload);
        toast.success('บันทึกการเช็คชื่อสำเร็จ!', { id: toastId });
      }

      // บันทึกเสร็จให้เด้งกลับหน้าแรก
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      const message = error instanceof AxiosError
        ? error.response?.data?.message
        : null;
      toast.error(message || 'เกิดข้อผิดพลาดในการบันทึก', { id: toastId });
    }
  };

  // UI ของปุ่มสถานะรายบุคคล
  const StatusButton = ({
    studentId, status, label, activeColor, inactiveColor, icon: Icon
  }: {
    studentId: string, status: AttendanceStatus, label: string, activeColor: string, inactiveColor: string, icon: LucideIcon
  }) => {
    const isActive = records[studentId] === status;
    return (
      <button
        onClick={() => handleStatusChange(studentId, status)}
        className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-xl transition-all active:scale-95 ${isActive ? activeColor : inactiveColor
          }`}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 lg:pb-28">

      {/* Header */}
      <div className="bg-primary px-6 pt-10 pb-6 rounded-b-[30px] shadow-md sticky top-0 z-20 lg:static lg:px-10 lg:pt-9 lg:pb-8 lg:rounded-b-[40px]">
        <div className="flex items-center justify-between text-white mb-3 lg:max-w-6xl lg:mx-auto">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList size={24} /> {isEditing ? 'แก้ไขการเช็คชื่อ' : 'บันทึกการเช็คชื่อ'}
            </h1>
            <p className="text-primary-light text-sm mt-1">ห้อง {className || 'กำลังโหลด...'}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-primary-light">จำนวนนักเรียน</span>
            <span className="text-xl font-bold">{students.length} คน</span>
          </div>
        </div>

        {/* Action Bar ใต้ Header */}
        <div className="flex items-center gap-2 bg-white/20 w-max px-3 py-1.5 rounded-xl backdrop-blur-sm lg:max-w-6xl lg:mx-auto">
          {attendanceType === 'ASSEMBLY' ? <Flag size={16} className="text-white" /> : <MapPin size={16} className="text-white" />}
          <span className="text-xs font-bold text-white">
            {attendanceType === 'ASSEMBLY' ? 'เข้าแถวหน้าเสาธง' : attendanceType === 'AREA' ? 'เวรเขตพื้นที่' : 'ยังไม่เลือก'}
          </span>
        </div>
      </div>

      {/* 💡 แผงควบคุม: เปลี่ยนสถานะทั้งหมด (Bulk Actions) */}
      <div className="px-4 mt-4 relative z-10 lg:max-w-6xl lg:mx-auto lg:px-10 lg:mt-6">
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={16} className="text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการทั้งห้อง</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <button onClick={() => handleMarkAll('PRESENT', 'มาเรียน')} className="flex-1 py-2 flex flex-col items-center gap-1 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 active:scale-95 transition-all">
              <CheckCircle2 size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">มาทั้งหมด</span>
            </button>
            <button onClick={() => handleMarkAll('LATE', 'สาย')} className="flex-1 py-2 flex flex-col items-center gap-1 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-95 transition-all">
              <Clock size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">สายทั้งหมด</span>
            </button>
            <button onClick={() => handleMarkAll('LEAVE', 'ลา')} className="flex-1 py-2 flex flex-col items-center gap-1 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all">
              <CalendarDays size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">ลาทั้งหมด</span>
            </button>
            <button onClick={() => handleMarkAll('ACTIVITY', 'กิจกรรม')} className="flex-1 py-2 flex flex-col items-center gap-1 rounded-xl bg-cyan-50 text-cyan-600 hover:bg-cyan-100 active:scale-95 transition-all">
              <Activity size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">กิจกรรม</span>
            </button>
            <button onClick={() => handleMarkAll('ABSENT', 'ขาด')} className="flex-1 py-2 flex flex-col items-center gap-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all">
              <XCircle size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">ขาดทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="px-4 py-4 space-y-3 lg:max-w-6xl lg:mx-auto lg:px-10 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {students.map((student, index) => (
          <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{student.firstName} {student.lastName}</p>
                <p className="text-[10px] text-gray-400 font-mono">รหัส: {student.citizenId}</p>
              </div>
            </div>

            {/* Status Toggles */}
            <div className="grid grid-cols-5 gap-2">
              <StatusButton
                studentId={student.id} status="PRESENT" label="มา" icon={CheckCircle2}
                activeColor="bg-green-500 text-white shadow-md shadow-green-200"
                inactiveColor="bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-500"
              />
              <StatusButton
                studentId={student.id} status="LATE" label="สาย" icon={Clock}
                activeColor="bg-orange-500 text-white shadow-md shadow-orange-200"
                inactiveColor="bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500"
              />
              <StatusButton
                studentId={student.id} status="LEAVE" label="ลา" icon={CalendarDays}
                activeColor="bg-blue-500 text-white shadow-md shadow-blue-200"
                inactiveColor="bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
              />
              <StatusButton
                studentId={student.id} status="ACTIVITY" label="กิจกรรม" icon={Activity}
                activeColor="bg-cyan-500 text-white shadow-md shadow-cyan-200"
                inactiveColor="bg-gray-50 text-gray-400 hover:bg-cyan-50 hover:text-cyan-500"
              />
              <StatusButton
                studentId={student.id} status="ABSENT" label="ขาด" icon={XCircle}
                activeColor="bg-red-500 text-white shadow-md shadow-red-200"
                inactiveColor="bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Save Button */}
      {attendanceType && students.length > 0 && (
        <div className="fixed bottom-[72px] lg:bottom-0 left-0 lg:left-64 w-full lg:w-[calc(100%_-_16rem)] px-6 py-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-40">
          <button
            onClick={handleSaveAttendance}
            className="w-full lg:max-w-2xl lg:mx-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            <Save size={20} /> {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลเข้าสู่ระบบ'}
          </button>
        </div>
      )}

      {/* --- Modal: เลือกประเภทการเช็คชื่อ --- */}
      <Transition appear show={isTypeModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {
          if (!attendanceType) navigate('/');
        }}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <Dialog.Title as="h3" className="text-xl font-black text-gray-800 text-center mb-2">
                    เลือกรายการเช็คชื่อ
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 text-center mb-6">กรุณาเลือกประเภทที่คุณครูต้องการบันทึก</p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleSelectAttendanceType('ASSEMBLY')}
                      disabled={checkingType !== null}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-100 hover:border-blue-500 bg-blue-50/50 transition-all active:scale-95"
                    >
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md">
                        <Flag size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-800">เข้าแถวหน้าเสาธง</p>
                        <p className="text-xs text-gray-500">บันทึกกิจกรรมช่วงเช้า</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSelectAttendanceType('AREA')}
                      disabled={checkingType !== null}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-100 hover:border-orange-500 bg-orange-50/50 transition-all active:scale-95"
                    >
                      <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-md">
                        <MapPin size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-800">เวรเขตพื้นที่</p>
                        <p className="text-xs text-gray-500">บันทึกการทำความสะอาด</p>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={() => navigate('/')}
                    className="w-full mt-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 active:scale-95"
                  >
                    ยกเลิกและกลับหน้าแรก
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
