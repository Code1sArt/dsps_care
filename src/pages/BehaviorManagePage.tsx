import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  AlertCircle, Check, CheckSquare, ChevronLeft, History, Loader2,
  MinusCircle, PlusCircle, Save, Search, ShieldCheck, Square, Trash2,
  UserRoundCheck, Users, X
} from 'lucide-react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';

type UserRole = 'TEACHER' | 'AFFAIRS' | 'STUDENT' | 'PARENT' | 'ADMIN';
type PointType = 'ADD' | 'DEDUCT';
type ManageMode = 'single' | 'bulk';

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

interface CategoryPickerProps {
  categories: PointCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
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

function CategoryPicker({ categories, selectedCategoryId, onSelectCategory }: CategoryPickerProps) {
  const addCategories = categories.filter(category => category.type === 'ADD');
  const deductCategories = categories.filter(category => category.type === 'DEDUCT');

  const renderGroup = (
    title: string,
    type: PointType,
    groupCategories: PointCategory[],
  ) => {
    const isAdd = type === 'ADD';
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-xs font-black ${isAdd ? 'text-green-700' : 'text-red-700'}`}>
          {isAdd ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
          {title}
        </div>
        {groupCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs font-medium text-gray-400">
            ไม่มีประเภทคะแนนในกลุ่มนี้
          </div>
        ) : (
          <div className="grid gap-2">
            {groupCategories.map(category => {
              const selected = selectedCategoryId === String(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(String(category.id))}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.99] ${
                    selected
                      ? isAdd
                        ? 'border-green-300 bg-green-50 ring-2 ring-green-100'
                        : 'border-red-300 bg-red-50 ring-2 ring-red-100'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-gray-800">{category.name}</span>
                    <span className={`mt-0.5 block text-[10px] font-bold ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                      {isAdd ? 'เพิ่ม' : 'ลด'} {category.defaultPoints} คะแนน
                    </span>
                  </span>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? isAdd ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-300'
                  }`}>
                    <Check size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      {renderGroup('เพิ่มคะแนน', 'ADD', addCategories)}
      {renderGroup('ลดคะแนน', 'DEDUCT', deductCategories)}
    </div>
  );
}

export default function BehaviorManagePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [mode, setMode] = useState<ManageMode>('single');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [singleCategoryId, setSingleCategoryId] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [singleNote, setSingleNote] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<BehaviorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSingle, setSavingSingle] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
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

  const selectedStudents = useMemo(
    () => selectedStudentIds
      .map(studentId => students.find(student => student.id === studentId))
      .filter((student): student is Student => Boolean(student)),
    [selectedStudentIds, students],
  );

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

  const refreshTeacherStudents = async () => {
    const classroomId = currentUser?.advisingClasses?.[0]?.id;
    if (!classroomId) return;
    const studentsRes = await api.get<Student[]>('/students', {
      params: { classroomId },
    });
    setStudents(studentsRes.data);
  };

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

  const openStudentForm = (student: Student) => {
    if (mode === 'bulk') {
      setSelectedStudentIds(prev =>
        prev.includes(student.id)
          ? prev.filter(id => id !== student.id)
          : [...prev, student.id],
      );
      return;
    }

    setSingleCategoryId('');
    setSingleNote('');
    void fetchStudentHistory(student);
  };

  const closeStudentForm = () => {
    setActiveStudent(null);
    setHistory([]);
    setSingleCategoryId('');
    setSingleNote('');
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map(student => student.id));
  };

  const clearSelected = () => {
    setSelectedStudentIds([]);
  };

  const handleModeChange = (nextMode: ManageMode) => {
    setMode(nextMode);
    setSelectedStudentIds([]);
    closeStudentForm();
  };

  const handleSaveSingle = async () => {
    if (!activeStudent) return;
    if (!singleCategoryId) {
      toast.error('กรุณาเลือกประเภทคะแนน');
      return;
    }

    try {
      setSavingSingle(true);
      await api.post('/behaviors', {
        studentId: activeStudent.id,
        categoryId: Number(singleCategoryId),
        note: singleNote.trim() || undefined,
      });
      toast.success('บันทึกคะแนนรายคนสำเร็จ');
      setSingleCategoryId('');
      setSingleNote('');
      await fetchStudentHistory(activeStudent);
      if (isTeacher) await refreshTeacherStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, 'บันทึกคะแนนไม่สำเร็จ'));
    } finally {
      setSavingSingle(false);
    }
  };

  const handleSaveBulk = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }
    if (!bulkCategoryId) {
      toast.error('กรุณาเลือกประเภทคะแนน');
      return;
    }

    try {
      setSavingBulk(true);
      await api.post('/behaviors/bulk', {
        studentIds: selectedStudentIds,
        categoryId: Number(bulkCategoryId),
        note: bulkNote.trim() || undefined,
      });
      toast.success(`บันทึกคะแนนให้นักเรียน ${selectedStudentIds.length} คนสำเร็จ`);
      setBulkCategoryId('');
      setBulkNote('');
      setSelectedStudentIds([]);
      if (isTeacher) await refreshTeacherStudents();
    } catch (error) {
      toast.error(getErrorMessage(error, 'บันทึกคะแนนแบบหลายคนไม่สำเร็จ'));
    } finally {
      setSavingBulk(false);
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
      <div className="bg-primary px-5 pt-10 pb-5 shadow-md lg:px-10 lg:pt-9 lg:pb-8">
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
              <p className="text-[10px] font-bold text-primary-light">โหมด</p>
              <p className="text-sm font-black">{mode === 'single' ? 'รายคน' : 'หลายคน'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10">
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                  mode === 'single' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
                }`}
              >
                <UserRoundCheck size={16} />
                รายคน
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('bulk')}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                  mode === 'bulk' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
                }`}
              >
                <Users size={16} />
                หลายคน
              </button>
            </div>

            <div className="relative mt-4">
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
              {mode === 'bulk' && (
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
              )}
            </div>
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {filteredStudents.map(student => {
              const selected = selectedStudentIds.includes(student.id);
              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => openStudentForm(student)}
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
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      mode === 'bulk'
                        ? selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-300'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {mode === 'bulk'
                        ? selected ? <CheckSquare size={17} /> : <Square size={17} />
                        : <PlusCircle size={17} />}
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
            <h2 className="text-sm font-black text-gray-800">
              {mode === 'single' ? 'บันทึกแบบรายคน' : 'บันทึกแบบหลายคน'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {mode === 'single'
                ? 'แตะชื่อนักเรียนเพื่อเปิดฟอร์มเพิ่มหรือลดคะแนน'
                : `เลือกนักเรียนแล้วบันทึกคะแนนพร้อมกัน ตอนนี้เลือก ${selectedStudentIds.length} คน`}
            </p>
          </div>

          {mode === 'bulk' && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-gray-800">รายการหลายคน</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                  {selectedStudentIds.length} คน
                </span>
              </div>

              {selectedStudents.length > 0 && (
                <div className="mb-4 max-h-28 space-y-1.5 overflow-y-auto rounded-xl bg-gray-50 p-2">
                  {selectedStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5">
                      <span className="truncate text-[11px] font-bold text-gray-700">{formatStudentName(student)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(prev => prev.filter(id => id !== student.id))}
                        className="text-gray-300 hover:text-red-500"
                        aria-label="เอานักเรียนออกจากรายการ"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {allowedCategories.length === 0 ? (
                <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  <AlertCircle size={16} className="shrink-0" />
                  ยังไม่มีประเภทคะแนนที่ role นี้ได้รับอนุญาต
                </div>
              ) : (
                <CategoryPicker
                  categories={allowedCategories}
                  selectedCategoryId={bulkCategoryId}
                  onSelectCategory={setBulkCategoryId}
                />
              )}

              <label className="mb-1 mt-4 block text-[10px] font-bold uppercase text-gray-400">
                หมายเหตุ
              </label>
              <textarea
                value={bulkNote}
                onChange={event => setBulkNote(event.target.value)}
                rows={3}
                placeholder="รายละเอียดเพิ่มเติม..."
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                onClick={handleSaveBulk}
                disabled={savingBulk || selectedStudentIds.length === 0 || !bulkCategoryId}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBulk ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                บันทึกหลายคน
              </button>
            </div>
          )}
        </aside>
      </div>

      <Transition appear show={Boolean(activeStudent)} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={closeStudentForm}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-6 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-6 sm:scale-95"
              >
                <Dialog.Panel className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-[28px] bg-gray-50 text-left shadow-2xl sm:rounded-[28px]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
                    <div className="min-w-0">
                      <Dialog.Title className="truncate text-lg font-black text-gray-800">
                        {activeStudent ? formatStudentName(activeStudent) : 'บันทึกคะแนน'}
                      </Dialog.Title>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        รหัส {activeStudent?.citizenId} · {activeStudent?.classroom?.name ?? '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeStudentForm}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:scale-95"
                      aria-label="ปิดฟอร์ม"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-4 text-sm font-black text-gray-800">เลือกประเภทคะแนน</h3>

                        {allowedCategories.length === 0 ? (
                          <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                            <AlertCircle size={16} className="shrink-0" />
                            ยังไม่มีประเภทคะแนนที่ role นี้ได้รับอนุญาต
                          </div>
                        ) : (
                          <CategoryPicker
                            categories={allowedCategories}
                            selectedCategoryId={singleCategoryId}
                            onSelectCategory={setSingleCategoryId}
                          />
                        )}

                        <label className="mb-1 mt-4 block text-[10px] font-bold uppercase text-gray-400">
                          หมายเหตุ
                        </label>
                        <textarea
                          value={singleNote}
                          onChange={event => setSingleNote(event.target.value)}
                          rows={3}
                          placeholder="รายละเอียดเพิ่มเติม..."
                          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        <button
                          type="button"
                          onClick={handleSaveSingle}
                          disabled={savingSingle || !singleCategoryId}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingSingle ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          บันทึกรายคน
                        </button>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-800">
                          <History size={17} className="text-primary" />
                          ประวัติคะแนน
                        </h3>

                        {historyLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary" size={24} />
                          </div>
                        ) : history.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs font-medium text-gray-400">
                            ยังไม่มีประวัติคะแนน
                          </div>
                        ) : (
                          <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
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
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
