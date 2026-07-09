import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Medal,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';

type StudentStatus = 'NORMAL' | 'FAILED' | 'CERTIFICATE' | 'SHIELD';
type StatusFilter = 'ALL' | StudentStatus;

interface CurrentUser {
  role: 'TEACHER' | 'AFFAIRS' | 'STUDENT' | 'PARENT' | 'ADMIN';
  advisingClasses?: Array<{ id: number; name: string }>;
}

interface ClassroomSummary {
  className: string;
  thresholds?: {
    starting: number;
    failing: number;
    certificate: number;
    shield: number;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    shield: number;
    certificate: number;
  };
  students: Array<{
    id: string;
    name: string;
    score: number;
    status: StudentStatus;
  }>;
}

const statusConfig = {
  NORMAL: {
    label: 'ผ่านเกณฑ์',
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-100',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'ต้องปรับปรุง',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: AlertTriangle,
  },
  CERTIFICATE: {
    label: 'เกียรติบัตร',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: Medal,
  },
  SHIELD: {
    label: 'โล่รางวัล',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    icon: Trophy,
  },
};

export default function ClassroomStatsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ClassroomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const userRes = await api.get<CurrentUser>('/users/me');
        if (userRes.data.role !== 'TEACHER') {
          toast.error('เมนูนี้สำหรับครูที่ปรึกษาเท่านั้น');
          navigate('/');
          return;
        }

        const classroomId = userRes.data.advisingClasses?.[0]?.id;
        if (!classroomId) {
          toast.error('ไม่พบห้องเรียนที่ปรึกษา');
          navigate('/');
          return;
        }

        const summaryRes = await api.get<ClassroomSummary>(`/summary/classroom/${classroomId}`);
        setSummary(summaryRes.data);
      } catch {
        toast.error('โหลดสถิติห้องเรียนไม่สำเร็จ');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [navigate]);

  const filteredStudents = useMemo(() => {
    if (!summary) return [];
    const query = searchQuery.trim().toLowerCase();
    return summary.students
      .filter(student => statusFilter === 'ALL' || student.status === statusFilter)
      .filter(student => !query || student.name.toLowerCase().includes(query))
      .sort((left, right) => {
        if (left.status === 'FAILED' && right.status !== 'FAILED') return -1;
        if (left.status !== 'FAILED' && right.status === 'FAILED') return 1;
        return right.score - left.score || left.name.localeCompare(right.name, 'th');
      });
  }, [searchQuery, statusFilter, summary]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!summary) return null;

  const normalCount = summary.summary.passed - summary.summary.certificate - summary.summary.shield;
  const filterItems: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'ทั้งหมด', count: summary.summary.total },
    { key: 'FAILED', label: 'ต้องปรับปรุง', count: summary.summary.failed },
    { key: 'NORMAL', label: 'ผ่านเกณฑ์', count: Math.max(0, normalCount) },
    { key: 'CERTIFICATE', label: 'เกียรติบัตร', count: summary.summary.certificate },
    { key: 'SHIELD', label: 'โล่รางวัล', count: summary.summary.shield },
  ];

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
                <BarChart3 size={24} className="shrink-0" />
                สถิติห้องเรียน
              </h1>
              <p className="mt-1 text-xs font-medium text-white/70">ห้อง {summary.className}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-white/12 px-3 py-2 text-right">
              <p className="text-[10px] font-bold text-white/60">นักเรียน</p>
              <p className="text-sm font-black">{summary.summary.total} คน</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 lg:px-10">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100 lg:col-span-1">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users size={20} />
            </div>
            <p className="text-[11px] font-bold text-gray-500">ทั้งหมด</p>
            <p className="mt-1 text-2xl font-black text-gray-800">{summary.summary.total}</p>
          </div>

          <div className="rounded-3xl bg-green-50 p-4 shadow-sm ring-1 ring-green-100">
            <CheckCircle2 size={20} className="mb-3 text-green-700" />
            <p className="text-[11px] font-bold text-green-700">ผ่านเกณฑ์</p>
            <p className="mt-1 text-2xl font-black text-green-800">{summary.summary.passed}</p>
          </div>

          <div className="rounded-3xl bg-red-50 p-4 shadow-sm ring-1 ring-red-100">
            <XCircle size={20} className="mb-3 text-red-700" />
            <p className="text-[11px] font-bold text-red-700">ต้องปรับปรุง</p>
            <p className="mt-1 text-2xl font-black text-red-800">{summary.summary.failed}</p>
          </div>

          <div className="rounded-3xl bg-blue-50 p-4 shadow-sm ring-1 ring-blue-100">
            <Medal size={20} className="mb-3 text-blue-700" />
            <p className="text-[11px] font-bold text-blue-700">เกียรติบัตร</p>
            <p className="mt-1 text-2xl font-black text-blue-800">{summary.summary.certificate}</p>
          </div>

          <div className="rounded-3xl bg-purple-50 p-4 shadow-sm ring-1 ring-purple-100">
            <Trophy size={20} className="mb-3 text-purple-700" />
            <p className="text-[11px] font-bold text-purple-700">โล่รางวัล</p>
            <p className="mt-1 text-2xl font-black text-purple-800">{summary.summary.shield}</p>
          </div>
        </section>

        {summary.thresholds && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-sm font-black text-gray-800">เกณฑ์คะแนนของห้อง</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-[10px] font-bold text-gray-500">คะแนนตั้งต้น</p>
                <p className="mt-1 text-lg font-black text-gray-800">{summary.thresholds.starting}</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-[10px] font-bold text-red-600">ตกเกณฑ์ต่ำกว่า</p>
                <p className="mt-1 text-lg font-black text-red-700">{summary.thresholds.failing}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[10px] font-bold text-blue-600">เกียรติบัตรตั้งแต่</p>
                <p className="mt-1 text-lg font-black text-blue-700">{summary.thresholds.certificate}</p>
              </div>
              <div className="rounded-2xl bg-purple-50 p-3">
                <p className="text-[10px] font-bold text-purple-600">โล่รางวัลตั้งแต่</p>
                <p className="mt-1 text-lg font-black text-purple-700">{summary.thresholds.shield}</p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="ค้นหาชื่อนักเรียน..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {filterItems.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black transition-all active:scale-95 ${
                  statusFilter === item.key
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {item.label} {item.count}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {filteredStudents.map(student => {
            const conf = statusConfig[student.status];
            const Icon = conf.icon;
            return (
              <div
                key={student.id}
                className={`rounded-3xl border bg-white p-4 shadow-sm ${conf.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black leading-5 text-gray-800">{student.name}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 ${conf.bg} ${conf.text}`}>
                      <Icon size={13} />
                      <span className="text-[11px] font-black">{conf.label}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-2xl font-black leading-none ${conf.text}`}>{student.score}</p>
                    <p className="mt-1 text-[10px] font-bold text-gray-400">คะแนน</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredStudents.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-400">
              ไม่พบนักเรียนตามเงื่อนไข
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
