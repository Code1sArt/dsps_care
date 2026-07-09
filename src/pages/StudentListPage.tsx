import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Search,
  User,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';

interface CurrentUser {
  role: 'TEACHER' | 'AFFAIRS' | 'STUDENT' | 'PARENT' | 'ADMIN';
  advisingClasses?: Array<{ id: number; name: string }>;
}

interface Student {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  isLineLinked?: boolean;
  linePictureUrl?: string | null;
  classroom?: {
    id?: number;
    name: string;
  } | null;
}

const formatStudentName = (student: Student) =>
  `${student.firstName} ${student.lastName}`.trim();

export default function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classroomName, setClassroomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const userRes = await api.get<CurrentUser>('/users/me');
        if (userRes.data.role !== 'TEACHER') {
          toast.error('เมนูนี้สำหรับครูที่ปรึกษาเท่านั้น');
          navigate('/');
          return;
        }

        const classroom = userRes.data.advisingClasses?.[0];
        if (!classroom) {
          toast.error('ไม่พบห้องเรียนที่ปรึกษา');
          navigate('/');
          return;
        }

        setClassroomName(classroom.name);
        const studentsRes = await api.get<Student[]>('/students', {
          params: { classroomId: classroom.id },
        });
        setStudents(studentsRes.data);
      } catch {
        toast.error('โหลดรายชื่อนักเรียนไม่สำเร็จ');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    void fetchStudents();
  }, [navigate]);

  const sortedStudents = useMemo(() => sortStudents(students), [students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedStudents;
    return sortedStudents.filter(student =>
      `${student.citizenId} ${student.firstName} ${student.lastName}`
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, sortedStudents]);

  const linkedCount = students.filter(student => student.isLineLinked).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-24">
      <div className="bg-primary px-5 pb-6 pt-10 text-white shadow-sm lg:px-10">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-white/75 active:scale-95"
          >
            <ChevronLeft size={16} />
            หน้าแรก
          </button>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-black leading-tight sm:text-2xl">
                <Users size={24} className="shrink-0" />
                รายชื่อนักเรียน
              </h1>
              <p className="mt-1 text-xs font-medium text-white/70">
                ห้อง {classroomName || '-'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/12 px-3 py-2 text-right">
              <p className="text-[10px] font-bold text-white/60">ทั้งหมด</p>
              <p className="text-sm font-black">{students.length} คน</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 lg:px-10">
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={20} />
            </div>
            <p className="text-[11px] font-bold text-gray-500">นักเรียนในห้อง</p>
            <p className="mt-1 text-2xl font-black text-gray-800">{students.length}</p>
          </div>
          <div className="rounded-3xl bg-green-50 p-4 shadow-sm ring-1 ring-green-100">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <UserCheck size={20} />
            </div>
            <p className="text-[11px] font-bold text-green-700">ผูก LINE แล้ว</p>
            <p className="mt-1 text-2xl font-black text-green-800">{linkedCount}</p>
          </div>
        </section>

        <section className="sticky top-0 z-20 -mx-4 bg-[#f6f7fb]/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:px-0 lg:pt-0">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="mt-3 text-xs font-black text-gray-500">
              เรียงตามรูปแบบเช็คชื่อ {filteredStudents.length} คน
            </p>
          </div>
        </section>

        <section className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {filteredStudents.map((student, index) => (
            <div
              key={student.id}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-xs font-black text-gray-500">
                  {index + 1}
                </div>
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-primary/10 text-primary">
                  {student.linePictureUrl ? (
                    <img
                      src={student.linePictureUrl}
                      alt={formatStudentName(student)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={26} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-black leading-5 text-gray-800">
                    {formatStudentName(student)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-gray-400">
                    รหัส: {student.citizenId}
                  </p>
                  <div className={`mt-2 inline-flex rounded-xl px-2.5 py-1 text-[10px] font-black ${
                    student.isLineLinked
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  >
                    {student.isLineLinked ? 'ผูก LINE แล้ว' : 'ยังไม่ผูก LINE'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredStudents.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-400 sm:col-span-2">
              ไม่พบนักเรียนตามคำค้นหา
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
