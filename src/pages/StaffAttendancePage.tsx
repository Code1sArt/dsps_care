import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  HeartPulse,
  RefreshCw,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

type UserRole = 'TEACHER' | 'ADMIN' | 'EXECUTIVE';
type NoticeType = 'PERSONAL_LEAVE' | 'SICK_LEAVE' | 'LATE_ARRIVAL';

interface Notice {
  id: string;
  type: NoticeType;
  date: string;
  arrivalTime: string | null;
  reason: string;
  createdAt: string;
  teacher?: {
    id: string;
    citizenId: string;
    firstName: string;
    lastName: string;
  };
}

interface DailySummary {
  date: string;
  totals: {
    total: number;
    personalLeave: number;
    sickLeave: number;
    lateArrival: number;
  };
  records: Notice[];
}

const typeDetails: Record<NoticeType, { label: string; icon: typeof Clock3; tone: string }> = {
  PERSONAL_LEAVE: {
    label: 'ลากิจ',
    icon: BriefcaseBusiness,
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  SICK_LEAVE: {
    label: 'ลาป่วย',
    icon: HeartPulse,
    tone: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  LATE_ARRIVAL: {
    label: 'ขอเข้าสาย',
    icon: Clock3,
    tone: 'bg-blue-50 text-blue-700 border-blue-100',
  },
};

const bangkokDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const thaiDate = (value: string) =>
  new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'long',
  }).format(new Date(`${value}T00:00:00+07:00`));

const apiMessage = (error: unknown) => {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่';
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join('\n') : message || 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่';
};

function NoticeCard({ notice, showTeacher }: { notice: Notice; showTeacher: boolean }) {
  const detail = typeDetails[notice.type];
  const Icon = detail.icon;
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showTeacher && notice.teacher && (
            <p className="truncate text-sm font-black text-gray-800">
              {notice.teacher.firstName} {notice.teacher.lastName}
            </p>
          )}
          <p className="mt-0.5 text-xs text-gray-500">{thaiDate(notice.date)}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${detail.tone}`}>
          <Icon size={14} /> {detail.label}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">{notice.reason}</p>
      {notice.arrivalTime && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
          <Clock3 size={14} /> คาดว่าจะมาถึง {notice.arrivalTime} น.
        </p>
      )}
    </article>
  );
}

export default function StaffAttendancePage() {
  const role = useMemo<UserRole>(() => {
    try {
      return (JSON.parse(localStorage.getItem('user_data') ?? '{}') as { role?: UserRole }).role ?? 'TEACHER';
    } catch {
      return 'TEACHER';
    }
  }, []);
  const isTeacher = role === 'TEACHER';
  const [date, setDate] = useState(bangkokDate);
  const [type, setType] = useState<NoticeType>('PERSONAL_LEAVE');
  const [arrivalTime, setArrivalTime] = useState('');
  const [reason, setReason] = useState('');
  const [records, setRecords] = useState<Notice[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isTeacher) {
        const response = await api.get<Notice[]>('/staff-attendance/mine');
        setRecords(response.data);
      } else {
        const response = await api.get<DailySummary>('/staff-attendance/summary/daily', {
          params: { date },
        });
        setSummary(response.data);
      }
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setLoading(false);
    }
  }, [date, isTeacher]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/staff-attendance', {
        type,
        date,
        reason,
        ...(type === 'LATE_ARRIVAL' ? { arrivalTime } : {}),
      });
      toast.success('ส่งรายการเรียบร้อยแล้ว');
      setReason('');
      setArrivalTime('');
      await load();
    } catch (error) {
      toast.error(apiMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const totalCards = summary
    ? [
        ['รายการทั้งหมด', summary.totals.total, 'bg-primary/10 text-primary'],
        ['ลากิจ', summary.totals.personalLeave, 'bg-amber-50 text-amber-700'],
        ['ลาป่วย', summary.totals.sickLeave, 'bg-rose-50 text-rose-700'],
        ['เข้าสาย', summary.totals.lateArrival, 'bg-blue-50 text-blue-700'],
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="rounded-b-[36px] bg-primary px-6 pb-16 pt-10 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <CalendarDays className="text-accent" size={28} />
          <h1 className="mt-3 text-2xl font-black">
            {isTeacher ? 'แจ้งลาและขอเข้าสาย' : 'สรุปการลาและเข้าสาย'}
          </h1>
          <p className="mt-1 text-xs text-white/70">
            {isTeacher ? 'แจ้งสถานะของคุณและตรวจสอบประวัติย้อนหลัง' : 'ภาพรวมรายวันสำหรับผู้ดูแลและผู้บริหาร'}
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-9 max-w-3xl space-y-5 px-5">
        {isTeacher ? (
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold text-gray-700">
                วันที่
                <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="space-y-1.5 text-xs font-bold text-gray-700">
                ประเภท
                <select value={type} onChange={(event) => setType(event.target.value as NoticeType)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary">
                  {Object.entries(typeDetails).map(([value, detail]) => <option key={value} value={value}>{detail.label}</option>)}
                </select>
              </label>
            </div>
            {type === 'LATE_ARRIVAL' && (
              <label className="block space-y-1.5 text-xs font-bold text-gray-700">
                เวลาที่คาดว่าจะมาถึง
                <input type="time" required value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary" />
              </label>
            )}
            <label className="block space-y-1.5 text-xs font-bold text-gray-700">
              เหตุผล
              <textarea required maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม" className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 outline-none focus:border-primary" />
            </label>
            <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60">
              <Send size={17} /> {saving ? 'กำลังส่ง…' : 'ส่งรายการ'}
            </button>
          </form>
        ) : (
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
            <label className="block space-y-1.5 text-xs font-bold text-gray-700">
              วันที่สรุป
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary" />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {totalCards.map(([label, value, tone]) => (
                <div key={String(label)} className={`rounded-2xl p-4 ${tone}`}>
                  <p className="text-[11px] font-bold opacity-80">{label}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-gray-800">{isTeacher ? 'ประวัติของฉัน' : `รายการวันที่ ${thaiDate(date)}`}</h2>
          <button type="button" onClick={() => void load()} className="rounded-xl p-2 text-primary" aria-label="โหลดข้อมูลใหม่"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">กำลังโหลดข้อมูล…</div>
        ) : (isTeacher ? records : summary?.records ?? []).length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">ยังไม่มีรายการ</div>
        ) : (
          <div className="space-y-3">
            {(isTeacher ? records : summary?.records ?? []).map((notice) => <NoticeCard key={notice.id} notice={notice} showTeacher={!isTeacher} />)}
          </div>
        )}
      </main>
    </div>
  );
}
