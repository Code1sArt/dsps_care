import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plane,
} from 'lucide-react';
import { api } from '../lib/api';

interface AcademicTerm {
  id: number;
  year: number;
  term: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface AcademicHoliday {
  id: number;
  date: string;
  name: string;
}

interface CalendarDay {
  date: string;
  isSchoolDay: boolean;
  reason: string | null;
}

interface CalendarMonth {
  termId: number;
  workingDays: number;
  days: CalendarDay[];
}

const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const toMonthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const parseDateKey = (dateString: string) => new Date(`${dateString.slice(0, 10)}T00:00:00.000Z`);

const formatThaiDate = (dateString: string) =>
  new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
  }).format(parseDateKey(dateString));

const formatThaiMonth = (monthKey: string) =>
  new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`));

const getMonthsInRange = (startDate: string, endDate: string) => {
  const months: string[] = [];
  const cursor = parseDateKey(startDate);
  cursor.setUTCDate(1);
  const end = parseDateKey(endDate);
  end.setUTCDate(1);

  while (cursor <= end) {
    months.push(toMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

const buildCalendarCells = (days: CalendarDay[]) => {
  if (days.length === 0) return [];
  const firstDay = parseDateKey(days[0].date).getUTCDay();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...days,
  ];
};

export default function AcademicCalendarCard() {
  const [term, setTerm] = useState<AcademicTerm | null>(null);
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [calendarByMonth, setCalendarByMonth] = useState<Record<string, CalendarMonth>>({});
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        setLoading(true);
        const termsRes = await api.get<AcademicTerm[]>('/terms');
        const activeTerm = termsRes.data.find(item => item.isActive) ?? termsRes.data[0];
        if (!activeTerm) {
          setTerm(null);
          return;
        }

        const monthKeys = getMonthsInRange(activeTerm.startDate, activeTerm.endDate);
        const todayMonth = toMonthKey(new Date());
        const initialMonth = monthKeys.includes(todayMonth) ? todayMonth : monthKeys[0];

        const [holidaysRes, calendarResponses] = await Promise.all([
          api.get<AcademicHoliday[]>(`/terms/${activeTerm.id}/holidays`),
          Promise.all(
            monthKeys.map(month =>
              api.get<CalendarMonth>(`/terms/${activeTerm.id}/calendar`, {
                params: { month },
              }),
            ),
          ),
        ]);

        setTerm(activeTerm);
        setHolidays(holidaysRes.data);
        setMonths(monthKeys);
        setSelectedMonth(initialMonth);
        setCalendarByMonth(
          Object.fromEntries(
            monthKeys.map((month, index) => [month, calendarResponses[index].data]),
          ),
        );
      } catch {
        toast.error('โหลดปฏิทินการศึกษาไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };

    void fetchCalendar();
  }, []);

  const totalSchoolDays = useMemo(
    () => Object.values(calendarByMonth).reduce((sum, month) => sum + month.workingDays, 0),
    [calendarByMonth],
  );

  const remainingSchoolDays = useMemo(() => {
    const today = toDateKey(new Date());
    return Object.values(calendarByMonth).reduce(
      (sum, month) => sum + month.days.filter(day => day.isSchoolDay && day.date >= today).length,
      0,
    );
  }, [calendarByMonth]);

  const selectedCalendar = selectedMonth ? calendarByMonth[selectedMonth] : null;
  const calendarCells = buildCalendarCells(selectedCalendar?.days ?? []);
  const selectedIndex = months.indexOf(selectedMonth);
  const upcomingHolidays = holidays
    .filter(holiday => holiday.date.slice(0, 10) >= toDateKey(new Date()))
    .slice(0, 4);
  const visibleHolidays = upcomingHolidays.length > 0 ? upcomingHolidays : holidays.slice(0, 4);

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-center py-8 text-primary">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    );
  }

  if (!term || !selectedCalendar) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm font-bold text-gray-400 shadow-sm">
        ยังไม่มีข้อมูลปฏิทินการศึกษา
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-gray-800">
            <CalendarDays size={18} className="text-primary" />
            ปฏิทินการศึกษา
          </h3>
          <p className="mt-1 text-[11px] font-bold text-gray-500">
            ภาคเรียนที่ {term.term} ปีการศึกษา {term.year}
          </p>
        </div>
        <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
          <p className="text-[10px] font-bold text-primary">คงเหลือ</p>
          <p className="text-sm font-black text-primary">{remainingSchoolDays} วัน</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="text-[10px] font-bold text-gray-500">วันเรียนในเทอม</p>
          <p className="mt-1 text-xl font-black text-gray-800">{totalSchoolDays}</p>
        </div>
        <div className="rounded-2xl bg-green-50 p-3">
          <p className="text-[10px] font-bold text-green-700">วันเรียนคงเหลือ</p>
          <p className="mt-1 text-xl font-black text-green-800">{remainingSchoolDays}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#f6f7fb] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedMonth(months[Math.max(0, selectedIndex - 1)])}
            disabled={selectedIndex <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm disabled:opacity-35"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={17} />
          </button>
          <p className="text-xs font-black text-gray-700">{formatThaiMonth(selectedMonth)}</p>
          <button
            type="button"
            onClick={() => setSelectedMonth(months[Math.min(months.length - 1, selectedIndex + 1)])}
            disabled={selectedIndex === months.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm disabled:opacity-35"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {dayLabels.map(day => (
            <div key={day} className="py-1 text-[10px] font-black text-gray-400">
              {day}
            </div>
          ))}
          {calendarCells.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="aspect-square" />;
            const dateNumber = Number(day.date.slice(8, 10));
            const isToday = day.date === toDateKey(new Date());
            return (
              <div
                key={day.date}
                className={`flex aspect-square items-center justify-center rounded-xl text-[11px] font-black ${
                  isToday
                    ? 'bg-primary text-white'
                    : day.isSchoolDay
                      ? 'bg-white text-gray-700'
                      : 'bg-red-50 text-red-500'
                }`}
                title={day.reason ?? 'วันเรียน'}
              >
                {dateNumber}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-black text-gray-700">
          <Plane size={15} className="text-red-500" />
          วันหยุด
        </div>
        {visibleHolidays.length > 0 ? (
          <div className="space-y-2">
            {visibleHolidays.map(holiday => (
              <div key={holiday.id} className="flex items-start justify-between gap-3 rounded-2xl bg-red-50 px-3 py-2">
                <p className="min-w-0 break-words text-xs font-bold leading-5 text-red-800">{holiday.name}</p>
                <p className="shrink-0 text-[10px] font-black text-red-600">{formatThaiDate(holiday.date)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs font-bold text-gray-400">
            ยังไม่มีวันหยุดที่บันทึกไว้
          </div>
        )}
      </div>
    </section>
  );
}
