import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  MinusCircle,
  PlusCircle,
  Save,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { sortStudents } from '../lib/studentSort';

type UserRole = 'TEACHER' | 'AFFAIRS' | 'STUDENT' | 'PARENT' | 'ADMIN';
type PointType = 'ADD' | 'DEDUCT';
type ManageMode = 'single' | 'bulk';
type BulkStep = 'students' | 'details';

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

interface Classroom {
  id: number;
  name: string;
  term?: { id: number; term: number; year: number };
  _count?: { students: number };
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
    id: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  };
}

interface CategoryPickerProps {
  categories: PointCategory[];
  selectedPointType: PointType | '';
  selectedCategoryId: string;
  searchQuery: string;
  page: number;
  onSelectPointType: (type: PointType) => void;
  onSelectCategory: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 10;

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

function CategoryPicker({
  categories,
  selectedPointType,
  selectedCategoryId,
  searchQuery,
  page,
  onSelectPointType,
  onSelectCategory,
  onSearchChange,
  onPageChange,
}: CategoryPickerProps) {
  const typeFilteredCategories = selectedPointType
    ? categories.filter(category => category.type === selectedPointType)
    : [];
  const query = searchQuery.trim().toLowerCase();
  const filteredCategories = query
    ? typeFilteredCategories.filter(category => category.name.toLowerCase().includes(query))
    : typeFilteredCategories;
  const pageCount = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleCategories = filteredCategories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const addCount = categories.filter(category => category.type === 'ADD').length;
  const deductCount = categories.filter(category => category.type === 'DEDUCT').length;

  const handleTypeSelect = (type: PointType) => {
    onSelectPointType(type);
    onSelectCategory('');
    onSearchChange('');
    onPageChange(1);
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    onPageChange(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-black text-gray-700">เลือกก่อนว่าจะบันทึกแบบไหน</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTypeSelect('ADD')}
            className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
              selectedPointType === 'ADD'
                ? 'border-green-300 bg-green-50 ring-2 ring-green-100'
                : 'border-gray-100 bg-white'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-green-700">
                <PlusCircle size={18} />
                เพิ่มคะแนน
              </span>
              {selectedPointType === 'ADD' && <Check size={17} className="text-green-700" />}
            </span>
            <span className="mt-1 block text-[11px] font-bold text-green-600">{addCount} รายการ</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSelect('DEDUCT')}
            className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
              selectedPointType === 'DEDUCT'
                ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                : 'border-gray-100 bg-white'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-red-700">
                <MinusCircle size={18} />
                ลดคะแนน
              </span>
              {selectedPointType === 'DEDUCT' && <Check size={17} className="text-red-700" />}
            </span>
            <span className="mt-1 block text-[11px] font-bold text-red-600">{deductCount} รายการ</span>
          </button>
        </div>
      </div>

      {selectedPointType ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={event => handleSearchChange(event.target.value)}
              placeholder="ค้นหาประเภทคะแนน..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            {visibleCategories.map(category => {
              const selected = selectedCategoryId === String(category.id);
              const isAdd = category.type === 'ADD';
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelectCategory(String(category.id))}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.99] ${
                    selected
                      ? isAdd
                        ? 'border-green-300 bg-green-50 ring-2 ring-green-100'
                        : 'border-red-300 bg-red-50 ring-2 ring-red-100'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className="block break-words text-sm font-black leading-5 text-gray-800"
                      style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                      }}
                    >
                      {category.name}
                    </span>
                    <span className={`mt-1 block text-[11px] font-bold ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                      {isAdd ? 'เพิ่ม' : 'ลด'} {category.defaultPoints} คะแนน
                    </span>
                  </span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? isAdd ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-300'
                  }`}>
                    <Check size={16} />
                  </span>
                </button>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs font-bold text-gray-400">
              ไม่พบประเภทคะแนนตามคำค้นหา
            </div>
          )}

          {filteredCategories.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm disabled:opacity-35"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-black text-gray-600">
                หน้า {safePage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
                disabled={safePage === pageCount}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm disabled:opacity-35"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-xs font-bold text-gray-400">
          เลือกเพิ่มคะแนนหรือ ลดคะแนน ก่อนเลือกรายการ
        </div>
      )}
    </div>
  );
}

export default function BehaviorManagePage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [mode, setMode] = useState<ManageMode>('single');
  const [bulkStep, setBulkStep] = useState<BulkStep>('students');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [singlePointType, setSinglePointType] = useState<PointType | ''>('');
  const [bulkPointType, setBulkPointType] = useState<PointType | ''>('');
  const [singleCategoryId, setSingleCategoryId] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [singleCategorySearch, setSingleCategorySearch] = useState('');
  const [bulkCategorySearch, setBulkCategorySearch] = useState('');
  const [singleCategoryPage, setSingleCategoryPage] = useState(1);
  const [bulkCategoryPage, setBulkCategoryPage] = useState(1);
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
        : category.allowedForAffairs,
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

  const selectedClassroom = useMemo(
    () => classrooms.find(classroom => String(classroom.id) === selectedClassroomId),
    [classrooms, selectedClassroomId],
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [userRes, categoriesRes, classroomsRes] = await Promise.all([
          api.get<CurrentUser>('/users/me'),
          api.get<PointCategory[]>('/point-categories'),
          api.get<Classroom[]>('/classrooms'),
        ]);

        const user = userRes.data;
        if (user.role !== 'TEACHER' && user.role !== 'AFFAIRS') {
          toast.error('เมนูนี้สำหรับครูและฝ่ายกิจการเท่านั้น');
          navigate('/');
          return;
        }

        setCurrentUser(user);
        setCategories(categoriesRes.data);
        setClassrooms(classroomsRes.data);

        if (user.role === 'TEACHER') {
          const classroomId = user.advisingClasses?.[0]?.id ?? classroomsRes.data[0]?.id;
          if (!classroomId) {
            toast.error('ไม่พบห้องเรียน');
            navigate('/');
            return;
          }

          setSelectedClassroomId(String(classroomId));
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
    if (!isTeacher || !selectedClassroomId) return;

    const controller = new AbortController();
    const fetchStudentsByClassroom = async () => {
      try {
        const studentsRes = await api.get<Student[]>('/students', {
          params: { classroomId: selectedClassroomId },
          signal: controller.signal,
        });
        setStudents(studentsRes.data);
        setSelectedStudentIds([]);
        setBulkStep('students');
        setBulkPointType('');
        setBulkCategoryId('');
        setBulkCategorySearch('');
        setBulkCategoryPage(1);
        setBulkNote('');
        setActiveStudent(null);
        setHistory([]);
        setSinglePointType('');
        setSingleCategoryId('');
        setSingleCategorySearch('');
        setSingleCategoryPage(1);
        setSingleNote('');
      } catch {
        if (!controller.signal.aborted) {
          toast.error('โหลดรายชื่อนักเรียนของห้องนี้ไม่สำเร็จ');
        }
      }
    };

    void fetchStudentsByClassroom();

    return () => {
      controller.abort();
    };
  }, [isTeacher, selectedClassroomId]);

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
    const classroomId = selectedClassroomId;
    if (!classroomId) return;
    const studentsRes = await api.get<Student[]>('/students', {
      params: { classroomId },
    });
    setStudents(studentsRes.data);
  };

  function resetSingleForm() {
    setSinglePointType('');
    setSingleCategoryId('');
    setSingleCategorySearch('');
    setSingleCategoryPage(1);
    setSingleNote('');
  }

  function resetBulkForm() {
    setBulkPointType('');
    setBulkCategoryId('');
    setBulkCategorySearch('');
    setBulkCategoryPage(1);
    setBulkNote('');
  }

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

    resetSingleForm();
    void fetchStudentHistory(student);
  };

  function closeStudentForm() {
    setActiveStudent(null);
    setHistory([]);
    resetSingleForm();
  }

  const selectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map(student => student.id));
  };

  const clearSelected = () => {
    setSelectedStudentIds([]);
    setBulkStep('students');
    resetBulkForm();
  };

  const handleModeChange = (nextMode: ManageMode) => {
    setMode(nextMode);
    setBulkStep('students');
    setSelectedStudentIds([]);
    resetBulkForm();
    closeStudentForm();
  };

  const goToBulkDetails = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }
    setBulkStep('details');
  };

  const handleSaveSingle = async () => {
    if (!activeStudent) return;
    if (!singlePointType) {
      toast.error('กรุณาเลือกเพิ่มหรือลดคะแนน');
      return;
    }
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
      resetSingleForm();
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
    if (!bulkPointType) {
      toast.error('กรุณาเลือกเพิ่มหรือลดคะแนน');
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
      resetBulkForm();
      setBulkStep('students');
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
    <div className="min-h-screen bg-[#f6f7fb] pb-28">
      <div className="bg-primary px-4 pb-5 pt-9 shadow-sm lg:px-10">
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
              <h1 className="flex items-center gap-2 text-xl font-black leading-tight text-white sm:text-2xl">
                <ShieldCheck size={24} className="shrink-0" />
                เพิ่ม/ลบ คะแนนพฤติกรรม
              </h1>
              <p className="mt-1 text-xs font-medium text-white/70">
                {isTeacher
                  ? selectedClassroom
                    ? `กำลังจัดการห้อง ${selectedClassroom.name}`
                    : 'เลือกห้องเรียนที่ต้องการจัดการ'
                  : 'ฝ่ายกิจการนักเรียน'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/12 px-3 py-2 text-right text-white">
              <p className="text-[10px] font-bold text-white/60">เลือกแล้ว</p>
              <p className="text-sm font-black">{selectedStudentIds.length} คน</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 lg:px-10">
        <div className="sticky top-0 z-20 -mx-4 bg-[#f6f7fb]/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:px-0 lg:pt-0">
          <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100">
            <button
              type="button"
              onClick={() => handleModeChange('single')}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition-all ${
                mode === 'single' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-500'
              }`}
            >
              <UserRoundCheck size={17} />
              รายคน
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('bulk')}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition-all ${
                mode === 'bulk' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-500'
              }`}
            >
              <Users size={17} />
              หลายคน
            </button>
          </div>
        </div>

        {isTeacher && (
          <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-gray-400">
              เลือกห้องเรียน
            </label>
            <select
              value={selectedClassroomId}
              onChange={event => setSelectedClassroomId(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
            >
              {classrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                  {classroom.term ? ` · ${classroom.term.term}/${classroom.term.year}` : ''}
                  {classroom._count ? ` · ${classroom._count.students} คน` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-500">
              ครูสามารถบันทึกเพิ่ม/ลบคะแนนให้ห้องอื่นได้ โดยยังใช้ประเภทคะแนนที่อนุญาตสำหรับครูเหมือนเดิม
            </p>
          </div>
        )}

        {mode === 'bulk' && (
          <div className="mb-4 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className={`rounded-2xl px-3 py-2 ${bulkStep === 'students' ? 'bg-primary/10' : 'bg-green-50'}`}>
                <p className={`text-[10px] font-black ${bulkStep === 'students' ? 'text-primary' : 'text-green-700'}`}>ขั้นตอน 1</p>
                <p className="text-xs font-black text-gray-800">เลือกนักเรียน</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
              <div className={`rounded-2xl px-3 py-2 ${bulkStep === 'details' ? 'bg-primary/10' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-black ${bulkStep === 'details' ? 'text-primary' : 'text-gray-400'}`}>ขั้นตอน 2</p>
                <p className="text-xs font-black text-gray-800">เลือกคะแนน</p>
              </div>
            </div>
          </div>
        )}

        {(mode === 'single' || bulkStep === 'students') && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={isAffairs ? 'ค้นหาชื่อ/รหัสนักเรียน...' : 'ค้นหาในห้องที่เลือก...'}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs font-black text-gray-500">
                  รายชื่อนักเรียน {filteredStudents.length} คน
                </p>
                {mode === 'bulk' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      disabled={filteredStudents.length === 0}
                      className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-black text-primary disabled:opacity-40"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={clearSelected}
                      disabled={selectedStudentIds.length === 0}
                      className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-500 disabled:opacity-40"
                    >
                      ล้าง
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredStudents.map(student => {
                const selected = selectedStudentIds.includes(student.id);
                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => openStudentForm(student)}
                    className={`w-full rounded-3xl border bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98] ${
                      selected ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black leading-5 text-gray-800">{formatStudentName(student)}</p>
                        <p className="mt-1 font-mono text-[10px] text-gray-400">รหัส: {student.citizenId}</p>
                        <p className="mt-1 text-[10px] font-bold text-gray-500">{student.classroom?.name ?? '-'}</p>
                      </div>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        mode === 'bulk'
                          ? selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-300'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {mode === 'bulk'
                          ? selected ? <CheckSquare size={18} /> : <Square size={18} />
                          : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-400 sm:col-span-2">
                  ไม่พบนักเรียนตามคำค้นหา
                </div>
              )}
            </div>
          </section>
        )}

        {mode === 'bulk' && bulkStep === 'details' && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-gray-800">นักเรียนที่เลือก</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">{selectedStudentIds.length} คน</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkStep('students')}
                  className="rounded-2xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 active:scale-95"
                >
                  กลับไปเลือก
                </button>
              </div>

              {selectedStudents.length > 0 && (
                <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-2xl bg-gray-50 p-2">
                  {selectedStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                      <span className="min-w-0 break-words text-xs font-bold leading-4 text-gray-700">{formatStudentName(student)}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(prev => prev.filter(id => id !== student.id))}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-300 hover:text-red-500"
                        aria-label="เอานักเรียนออกจากรายการ"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              {allowedCategories.length === 0 ? (
                <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                  <AlertCircle size={16} className="shrink-0" />
                  ยังไม่มีประเภทคะแนนที่ role นี้ได้รับอนุญาต
                </div>
              ) : (
                <CategoryPicker
                  categories={allowedCategories}
                  selectedPointType={bulkPointType}
                  selectedCategoryId={bulkCategoryId}
                  searchQuery={bulkCategorySearch}
                  page={bulkCategoryPage}
                  onSelectPointType={setBulkPointType}
                  onSelectCategory={setBulkCategoryId}
                  onSearchChange={setBulkCategorySearch}
                  onPageChange={setBulkCategoryPage}
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
                className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                onClick={handleSaveBulk}
                disabled={savingBulk || selectedStudentIds.length === 0 || !bulkPointType || !bulkCategoryId}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBulk ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                บันทึกหลายคน
              </button>
            </div>
          </section>
        )}
      </div>

      {mode === 'bulk' && bulkStep === 'students' && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-md px-4 pb-3 lg:bottom-4 lg:left-64 lg:max-w-sm">
          <button
            type="button"
            onClick={goToBulkDetails}
            disabled={selectedStudentIds.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-primary/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ถัดไป {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length} คน)` : ''}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

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
                <Dialog.Panel className="max-h-[94vh] w-full max-w-2xl overflow-hidden rounded-t-[30px] bg-[#f6f7fb] text-left shadow-2xl sm:rounded-[30px]">
                  <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
                    <div className="min-w-0">
                      <Dialog.Title className="break-words text-lg font-black leading-6 text-gray-800">
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

                  <div className="max-h-[calc(94vh-74px)] overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                        {allowedCategories.length === 0 ? (
                          <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-700">
                            <AlertCircle size={16} className="shrink-0" />
                            ยังไม่มีประเภทคะแนนที่ role นี้ได้รับอนุญาต
                          </div>
                        ) : (
                          <CategoryPicker
                            categories={allowedCategories}
                            selectedPointType={singlePointType}
                            selectedCategoryId={singleCategoryId}
                            searchQuery={singleCategorySearch}
                            page={singleCategoryPage}
                            onSelectPointType={setSinglePointType}
                            onSelectCategory={setSingleCategoryId}
                            onSearchChange={setSingleCategorySearch}
                            onPageChange={setSingleCategoryPage}
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
                          className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        <button
                          type="button"
                          onClick={handleSaveSingle}
                          disabled={savingSingle || !singlePointType || !singleCategoryId}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingSingle ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          บันทึกรายคน
                        </button>
                      </div>

                      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-800">
                          <History size={17} className="text-primary" />
                          ประวัติคะแนน
                        </h3>

                        {historyLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-primary" size={24} />
                          </div>
                        ) : history.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-xs font-medium text-gray-400">
                            ยังไม่มีประวัติคะแนน
                          </div>
                        ) : (
                          <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                            {history.map(record => {
                              const isAdd = record.category?.type === 'ADD';
                              const canDelete = record.recorder?.id === currentUser?.id;
                              return (
                                <div key={record.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="break-words text-xs font-black leading-5 text-gray-800">
                                        {record.category?.name ?? 'บันทึกคะแนน'}
                                      </p>
                                      <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(record.createdAt)}</p>
                                      {record.recorder && (
                                        <p className="mt-1 text-[10px] font-medium text-gray-400">
                                          บันทึกโดย {record.recorder.firstName} {record.recorder.lastName}
                                        </p>
                                      )}
                                      {record.note && (
                                        <p className="mt-2 rounded-xl bg-white p-2 text-[10px] leading-relaxed text-gray-500">
                                          {record.note}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className={`text-sm font-black ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                                        {isAdd ? '+' : '-'}{record.points}
                                      </p>
                                      {canDelete && (
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
                                      )}
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
