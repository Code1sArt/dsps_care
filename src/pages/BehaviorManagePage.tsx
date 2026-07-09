import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import {
  AlertCircle, Check, ChevronLeft, History, Loader2, MinusCircle,
  PlusCircle, Save, Search, ShieldCheck, Trash2, Users
} from 'lucide-react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';

type UserRole = 'TEACHER' | 'AFFAIRS' | 'STUDENT' | 'PARENT' | 'ADMIN';
type PointType = 'ADD' | 'DEDUCT';

interface CurrentUser {
  id: string;
  role: UserRole;
  firstName: string;
  advisingClasses?: Array<{ id: number; name: string }>;
}

interface Student {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  classroomId?: number;
  classroom?: { id?: number; name: string };
}

interface PointCategory {
  id: number;
  name: string;
  type: PointType;
  defaultPoints: number;
  allowedForTeacher: boolean;
  allowedForAffairs: boolean;
}

interface BehaviorRecord {
  id: string;
  points: number;
  note: string | null;
  createdAt: string;
  category: {
    name: string;
    type: PointType;
  } | null;
  recorder?: {
    firstName: string;
    lastName: string;
    role?: UserRole;
  };
}

const formatStudentName = (student: Student) =>
  `${student.firstName} ${student.lastName}`.trim();

const formatDateTime = (dateString: string) =>
  new Intl.DateTimeFormat('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? fallback;
    return message ?? fallback;
  }
  return fallback;
};

export default function BehaviorManagePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<BehaviorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isTeacher = currentUser?.role === 'TEACHER';
  const isAffairs = currentUser?.role === 'AFFAIRS';

  const allowedCategories = useMemo(() => {
    if (!currentUser) return [];
    return categories.filter(category =>
      currentUser.role === 'TEACHER'
        ? category.allowedForTeacher
        : category.allowedForAffairs
    );
  }, [categories, currentUser]);

  const selectedCategory = allowedCategories.find(
    category => String(category.id) === selectedCategoryId,
  );

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? students.filter(student =>
        `${student.citizenId} ${student.firstName} ${student.lastName} ${student.classroom?.name ?? ''}`
          .toLowerCase()
          .includes(query),
      )
      : students;
    return sortStudents(filtered);
  }, [students, searchQuery]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [userRes, categoriesRes] = await Promise.all([
          api.get<CurrentUser>('/users/me'),
          api.get<PointCategory[]>('/point-categories'),
        ]);

        const user = userRes.data;
        if (user.role !== 'TEACHER' && user.role !== 'AFFAIRS') {
          toast.error('เมนูนี้สำหรับครูและฝ่ายกิจการเท่านั้น');
          navigate('/');
          return;
        }

        setCurrentUser(user);
        setCategories(categoriesRes.data);

        if (user.role === 'TEACHER') {
          const classroomId = user.advisingClasses?.[0]?.id;
          if (!classroomId) {
            toast.error('ไม่พบห้องเรียนที่ปรึกษา');
            navigate('/');
            return;
          }

          const studentsRes = await api.get<Student[]>('/students', {
            params: { classroomId },
          });
          setStudents(studentsRes.data);
        } else {
          const studentsRes = await api.get<Student[]>('/students/search', {
            params: { q: '', limit: 30 },
          });
          setStudents(studentsRes.data);
        }
      } catch (error) {
        toast.error(getErrorMessage(error, 'โหลดข้อมูลไม่สำเร็จ'));
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    void fetchInitialData();
  }, [navigate]);

  useEffect(() => {
    if (!isAffairs) return;

    const query = searchQuery.trim();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await api.get<Student[]>('/students/search', {
          params: { q: query, limit: 50 },
          signal: controller.signal,
        });
        setStudents(res.data);
      } catch {
        if (!controller.signal.aborted) {
          toast.error('ค้นหานักเรียนไม่สำเร็จ');
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isAffairs, searchQuery]);

  const fetchStudentHistory = async (student: Student) => {
    try {
      setActiveStudent(student);
      setHistoryLoading(true);
      const res = await api.get<BehaviorRecord[]>(`/behaviors/student/${student.id}`);
      setHistory(res.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'โหลดประวัติคะแนนไม่สำเร็จ'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleStudent = (student: Student) => {
    setSelectedStudentIds(prev =>
      prev.includes(student.id)
        ? prev.filter(id => id !== student.id)
        : [...prev, student.id],
    );
    void fetchStudentHistory(student);
  };

  const selectAllFiltered = () => {
    const ids = filteredStudents.map(student => student.id);
    setSelectedStudentIds(ids);
    toast.success(`เลือกนักเรียน ${ids.length} คน`);
  };

  const clearSelected = () => {
    setSelectedStudentIds([]);
  };

  const refreshTeacherStudents = async () => {
    const classroomId = currentUser?.advisingClasses?.[0]?.id;
    if (!classroomId) return;
    const studentsRes = await api.get<Student[]>('/students', {
      params: { classroomId },
    });
    setStudents(studentsRes.data);
  };

  const handleSave = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('กรุณาเลือกประเภทคะแนน');
      return;
    }

    const payload = {
      categoryId: Number(selectedCategoryId),
      note: note.trim() || undefined,
    };

    try {
      setSaving(true);
      if (selectedStudentIds.length === 1) {
        await api.post('/behaviors', {
          ...payload,
          studentId: selectedStudentIds[0],
        });
      } else {
        await api.post('/behaviors/bulk', {
          ...payload,
          studentIds: selectedStudentIds,
        });
      }

      toast.success('บันทึกคะแนนพฤติกรรมสำเร็จ');
      setNote('');
      if (activeStudent) await fetchStudentHistory(activeStudent);
      if (isTeacher) await refreshTeacherStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, 'บันทึกคะแนนไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('ยืนยันลบรายการคะแนนนี้?')) return;

    try {
      setDeletingId(recordId);
      await api.delete(`/behaviors/${recordId}`);
      toast.success('ลบรายการสำเร็จ');
      if (activeStudent) await fetchStudentHistory(activeStudent);
      if (isTeacher) await refreshTeacherStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, 'ลบรายการไม่สำเร็จ'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-primary px-5 pt-10 pb-5 shadow-md lg:static lg:px-10 lg:pt-9 lg:pb-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-white/75 active:scale-95"
          >
            <ChevronLeft size={16} />
            หน้าแรก
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black text-white lg:text-2xl">
                <ShieldCheck size={24} />
                เพิ่ม/ลบ คะแนนพฤติกรรม
              </h1>
              <p className="mt-1 text-xs font-medium text-primary-light">
                {isTeacher
                  ? `ห้องที่ปรึกษา ${currentUser?.advisingClasses?.[0]?.name ?? ''}`
                  : 'ฝ่ายกิจการนักเรียน'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-right text-white">
              <p className="text-[10px] font-bold text-primary-light">เลือกแล้ว</p>
              <p className="text-lg font-black">{selectedStudentIds.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={isAffairs ? 'ค้นหาชื่อ/รหัสนักเรียน...' : 'ค้นหาในห้องที่ปรึกษา...'}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-500">
                รายชื่อนักเรียน {filteredStudents.length} คน
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  disabled={filteredStudents.length === 0}
                  className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary disabled:opacity-40"
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={clearSelected}
                  disabled={selectedStudentIds.length === 0}
                  className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 disabled:opacity-40"
                >
                  ล้าง
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {filteredStudents.map(student => {
              const selected = selectedStudentIds.includes(student.id);
              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => toggleStudent(student)}
                  className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98] ${
                    selected ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-800">{formatStudentName(student)}</p>
                      <p className="mt-1 font-mono text-[10px] text-gray-400">รหัส: {student.citizenId}</p>
                      <p className="mt-1 text-[10px] font-bold text-gray-500">{student.classroom?.name ?? '-'}</p>
                    </div>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-300'
                    }`}>
                      {selected ? <Check size={16} /> : <Users size={15} />}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-medium text-gray-400 lg:col-span-2">
                ไม่พบนักเรียนตามคำค้นหา
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-black text-gray-800">บันทึกคะแนน</h2>

            <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
              ประเภทคะแนนที่อนุญาต
            </label>
            <select
              value={selectedCategoryId}
              onChange={event => setSelectedCategoryId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">เลือกประเภทคะแนน</option>
              {allowedCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.type === 'ADD' ? '+' : '-'}{category.defaultPoints} คะแนน - {category.name}
                </option>
              ))}
            </select>

            {allowedCategories.length === 0 && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                <AlertCircle size={16} className="shrink-0" />
                ยังไม่มีประเภทคะแนนที่ role นี้ได้รับอนุญาต
              </div>
            )}

            {selectedCategory && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                selectedCategory.type === 'ADD'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {selectedCategory.type === 'ADD' ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
                {selectedCategory.type === 'ADD' ? 'เพิ่ม' : 'ลบ'} {selectedCategory.defaultPoints} คะแนน
              </div>
            )}

            <label className="mb-1 mt-4 block text-[10px] font-bold uppercase text-gray-400">
              หมายเหตุ
            </label>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedStudentIds.length === 0 || !selectedCategoryId}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              บันทึกคะแนน
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-800">
              <History size={17} className="text-primary" />
              ประวัตินักเรียน
            </h2>

            {!activeStudent ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs font-medium text-gray-400">
                แตะชื่อนักเรียนเพื่อดูประวัติและลบรายการที่บันทึกผิด
              </div>
            ) : (
              <div>
                <p className="mb-3 text-xs font-bold text-gray-700">
                  {formatStudentName(activeStudent)}
                </p>
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : history.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs font-medium text-gray-400">
                    ยังไม่มีประวัติคะแนน
                  </div>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {history.map(record => {
                      const isAdd = record.category?.type === 'ADD';
                      return (
                        <div key={record.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-800">
                                {record.category?.name ?? 'บันทึกคะแนน'}
                              </p>
                              <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(record.createdAt)}</p>
                              {record.note && (
                                <p className="mt-2 rounded-lg bg-white p-2 text-[10px] leading-relaxed text-gray-500">
                                  {record.note}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-sm font-black ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                                {isAdd ? '+' : '-'}{record.points}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDelete(record.id)}
                                disabled={deletingId === record.id}
                                className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-sm disabled:opacity-40"
                                aria-label="ลบรายการคะแนน"
                              >
                                {deletingId === record.id
                                  ? <Loader2 size={15} className="animate-spin" />
                                  : <Trash2 size={15} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
