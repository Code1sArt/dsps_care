import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  MapPin,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';

type UserRole = 'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN' | 'AFFAIRS';
type AttendanceType = 'ASSEMBLY' | 'AREA';
type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'ACTIVITY';

interface CurrentUser {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  advisingClasses?: Array<{ id: number; name: string }>;
  children?: Student[];
}

interface Student {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  classroom?: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  type: AttendanceType;
  status: AttendanceStatus;
  date: string;
  localDate?: string;
  classroom?: { name: string } | null;
  term?: { term: number; year: number } | null;
  recorder?: { firstName: string; lastName: string } | null;
}

const typeLabels: Record<AttendanceType, string> = {
  ASSEMBLY: 'เข้าแถวหน้าเสาธง',
  AREA: 'เวรเขตพื้นที่',
};

const statusConfig: Record<AttendanceStatus, {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
}> = {
  PRESENT: { label: 'มา', className: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle2 },
  LATE: { label: 'สาย', className: 'bg-orange-50 text-orange-700 border-orange-100', icon: Clock },
  LEAVE: { label: 'ลา', className: 'bg-blue-50 text-blue-700 border-blue-100', icon: CalendarDays },
  ACTIVITY: { label: 'กิจกรรม', className: 'bg-cyan-50 text-cyan-700 border-cyan-100', icon: Activity },
  ABSENT: { label: 'ขาด', className: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
};

const recordDate = (record: AttendanceRecord) =>
  record.localDate?.slice(0, 10) ?? record.date.slice(0, 10);

const formatThaiDate = (record: AttendanceRecord) => {
  const date = new Date(record.date);
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export default function AttendanceHistoryPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AttendanceType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const loadPage = async () => {
      try {
        const userRes = await api.get<CurrentUser>('/users/me');
        const user = userRes.data;
        setCurrentUser(user);

        if (user.role === 'STUDENT') {
          setSelectedStudent({
            id: user.id,
            citizenId: '',
            firstName: user.firstName,
            lastName: user.lastName,
          });
          const historyRes = await api.get<AttendanceRecord[]>(`/attendance/student/${user.id}`);
          setRecords(historyRes.data);
          return;
        }

        if (user.role === 'TEACHER') {
          const classroom = user.advisingClasses?.[0];
          if (!classroom) {
            toast.error('ไม่พบห้องเรียนที่ปรึกษา');
            return;
          }
          const studentsRes = await api.get<Student[]>('/students', {
            params: { classroomId: classroom.id },
          });
          setStudents(sortStudents(studentsRes.data));
          return;
        }

        if (user.role === 'PARENT') {
          const children = sortStudents(user.children ?? []);
          setStudents(children);

          if (children.length === 1) {
            await openStudentHistory(children[0]);
          }
        }
      } catch {
        toast.error('ไม่สามารถโหลดประวัติการเช็คชื่อได้');
      } finally {
        setLoading(false);
      }
    };

    void loadPage();
  }, []);

  async function openStudentHistory(student: Student) {
    try {
      setHistoryLoading(true);
      setSelectedStudent(student);
      setRecords([]);
      setTypeFilter('ALL');
      setStatusFilter('ALL');
      setDateFrom('');
      setDateTo('');
      const response = await api.get<AttendanceRecord[]>(`/attendance/student/${student.id}`);
      setRecords(response.data);
    } catch {
      toast.error('ไม่สามารถโหลดประวัติของนักเรียนได้');
      setSelectedStudent(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(student =>
      `${student.firstName} ${student.lastName} ${student.citizenId}`.toLowerCase().includes(query),
    );
  }, [searchQuery, students]);

  const filteredRecords = useMemo(() => records.filter(record => {
    const date = recordDate(record);
    return (
      (typeFilter === 'ALL' || record.type === typeFilter) &&
      (statusFilter === 'ALL' || record.status === statusFilter) &&
      (!dateFrom || date >= dateFrom) &&
      (!dateTo || date <= dateTo)
    );
  }), [dateFrom, dateTo, records, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const isStudentList =
    (currentUser?.role === 'TEACHER' || currentUser?.role === 'PARENT') &&
    !selectedStudent;
  const isParent = currentUser?.role === 'PARENT';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-primary px-6 pb-6 pt-10 text-white shadow-md lg:px-10 lg:pb-8 lg:pt-9">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            {(currentUser?.role === 'TEACHER' || currentUser?.role === 'PARENT') && selectedStudent && (
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setRecords([]);
                }}
                className="rounded-xl bg-white/15 p-2 transition-colors hover:bg-white/25"
                aria-label="กลับไปหน้ารายชื่อนักเรียน"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold lg:text-2xl">
                <ClipboardList size={24} />
                ประวัติการเช็คชื่อ
              </h1>
              <p className="mt-1 text-xs text-primary-light">
                {isStudentList
                  ? isParent
                    ? 'เลือกนักเรียนในความดูแล'
                    : `ห้อง ${currentUser.advisingClasses?.[0]?.name ?? '-'}`
                  : selectedStudent
                    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                    : 'ข้อมูลการเข้าเรียน'}
              </p>
            </div>
          </div>

          {isStudentList && (
            <div className="relative mt-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชื่อ นามสกุล หรือรหัสนักเรียน"
                className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
          )}
        </div>
      </header>

      {isStudentList ? (
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-10">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="font-bold text-gray-700">
              {isParent ? 'นักเรียนในความดูแล' : 'รายชื่อนักเรียน'}
            </h2>
            <span className="text-xs text-gray-500">{filteredStudents.length} คน</span>
          </div>
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {filteredStudents.map((student, index) => (
              <button
                key={student.id}
                onClick={() => openStudentHistory(student)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-800">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">รหัส {student.citizenId}</p>
                </div>
                <ChevronRight className="text-gray-300" size={20} />
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 lg:col-span-2">
                ไม่พบรายชื่อนักเรียน
              </div>
            )}
          </div>
        </main>
      ) : selectedStudent ? (
        <main className="mx-auto max-w-6xl px-4 py-5 lg:px-10">
          <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">ตัวกรอง</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value as 'ALL' | AttendanceType)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="ALL">ทุกประเภท</option>
                <option value="ASSEMBLY">เข้าแถวหน้าเสาธง</option>
                <option value="AREA">เวรเขตพื้นที่</option>
              </select>
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as 'ALL' | AttendanceStatus)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="PRESENT">มา</option>
                <option value="LATE">สาย</option>
                <option value="LEAVE">ลา</option>
                <option value="ACTIVITY">กิจกรรม</option>
                <option value="ABSENT">ขาด</option>
              </select>
              <label className="text-[10px] font-bold text-gray-500">
                ตั้งแต่วันที่
                <input
                  type="date"
                  value={dateFrom}
                  onChange={event => setDateFrom(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-primary"
                />
              </label>
              <label className="text-[10px] font-bold text-gray-500">
                ถึงวันที่
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={event => setDateTo(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-primary"
                />
              </label>
            </div>
          </section>

          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-bold text-gray-700">รายการย้อนหลัง</h2>
            <span className="text-xs text-gray-500">{filteredRecords.length} รายการ</span>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {filteredRecords.map(record => {
                const status = statusConfig[record.status];
                const StatusIcon = status.icon;
                return (
                  <article key={record.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          {record.type === 'ASSEMBLY' ? <UserRound size={20} /> : <MapPin size={20} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-800">{typeLabels[record.type]}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatThaiDate(record)}</p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                      ห้อง {record.classroom?.name ?? '-'}
                      {record.term && ` · ภาคเรียน ${record.term.term}/${record.term.year}`}
                      {record.recorder && (
                        <span className="block mt-1">
                          บันทึกโดย ครู {record.recorder.firstName} {record.recorder.lastName}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
              {filteredRecords.length === 0 && (
                <div className="rounded-2xl bg-white px-6 py-12 text-center lg:col-span-2">
                  <CalendarDays className="mx-auto mb-3 text-gray-300" size={36} />
                  <p className="text-sm font-bold text-gray-500">ไม่พบประวัติการเช็คชื่อ</p>
                  <p className="mt-1 text-xs text-gray-400">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</p>
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        <div className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-gray-500">
          บัญชีประเภทนี้ยังไม่รองรับหน้าประวัติการเช็คชื่อ
        </div>
      )}
    </div>
  );
}
