import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { History, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import ParentStudentPicker from './ParentStudentPicker';
import { studentLinks } from '../lib/parentStudentLinks';
import type { SelectedParentStudent } from '../lib/parentStudentLinks';

interface Child { id: string; firstName: string; lastName: string; classroom?: { name: string } | null }
interface ParentChildrenManagerProps { showViewActions?: boolean }
export default function ParentChildrenManager({ showViewActions = false }: ParentChildrenManagerProps) {
    const navigate = useNavigate();
    const [children, setChildren] = useState<Child[]>([]);
    const [selected, setSelected] = useState<SelectedParentStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [pickerVersion, setPickerVersion] = useState(0);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get<{ children: Child[] }>('/users/me');
            setChildren(response.data.children ?? []); setError('');
        } catch { setError('โหลดรายชื่อนักเรียนไม่สำเร็จ กรุณาลองใหม่'); }
        finally { setLoading(false); }
    };
    useEffect(() => {
        const controller = new AbortController();
        const initialLoad = async () => {
            try {
                const response = await api.get<{ children: Child[] }>('/users/me', { signal: controller.signal });
                if (!controller.signal.aborted) setChildren(response.data.children ?? []);
            } catch { if (!controller.signal.aborted) setError('โหลดรายชื่อนักเรียนไม่สำเร็จ กรุณาลองใหม่'); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        };
        void initialLoad();
        return () => controller.abort();
    }, []);
    const mutate = async (student?: Child) => {
        if (inFlight.current || (!student && !selected.length)) return;
        if (student && !window.confirm(`นำ ${student.firstName} ${student.lastName} ออกจากบัญชีนี้หรือไม่?`)) return;
        inFlight.current = true; setBusy(true); setError('');
        try {
            if (student) {
                await api.delete(`/parents/children/${encodeURIComponent(student.id)}`);
                setChildren(current => current.filter(item => item.id !== student.id));
                setPickerVersion(current => current + 1);
                toast.success('นำออกจากบัญชีแล้ว');
            } else {
                await api.patch('/parents/children', { students: studentLinks(selected) });
                setSelected([]);
                setPickerVersion(current => current + 1);
                toast.success('เพิ่มนักเรียนสำเร็จ');
                await load();
            }
        } catch (error: unknown) {
            const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
            setError(typeof message === 'string' ? message : 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
        } finally { inFlight.current = false; setBusy(false); }
    };
    return <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-5">
        <h2 className="font-bold text-gray-800">นักเรียนในความดูแล</h2>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => void load()} disabled={busy || loading} className="underline">โหลดรายชื่อใหม่</button></p>}
        {loading ? <p role="status" className="text-sm text-gray-500">กำลังโหลดรายชื่อ...</p> : <div className="space-y-2">
            {children.map(child => <div key={child.id} className="space-y-3 rounded-xl border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                    <div><p className="font-medium">{child.firstName} {child.lastName}</p><p className="text-xs text-gray-500">{child.classroom?.name ?? 'ไม่มีห้องเรียน'}</p></div>
                    <button type="button" disabled={busy} onClick={() => void mutate(child)} aria-label={`นำ ${child.firstName} ${child.lastName} ออกจากบัญชี`} className="shrink-0 rounded-lg px-3 py-2 text-red-600 disabled:opacity-50">นำออก</button>
                </div>
                {showViewActions && <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => navigate(`/behavior?studentId=${encodeURIComponent(child.id)}`)} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary">
                        <ShieldCheck size={16} /> พฤติกรรม
                    </button>
                    <button type="button" onClick={() => navigate(`/history?studentId=${encodeURIComponent(child.id)}`)} className="flex items-center justify-center gap-1.5 rounded-xl bg-accent-soft px-3 py-2.5 text-xs font-bold text-primary">
                        <History size={16} /> เช็คชื่อ
                    </button>
                </div>}
            </div>)}
            {children.length === 0 && <p className="text-sm text-gray-500">ยังไม่มีนักเรียนในความดูแล</p>}
        </div>}
        <p className="text-xs leading-5 text-gray-500">นำออกจากบัญชีนี้ได้ภายหลัง และใช้รหัสห้องเพื่อเพิ่มนักเรียนกลับเข้ามาได้</p>
        <ParentStudentPicker key={pickerVersion} value={selected} onChange={setSelected} disabled={busy || loading} />
        <button type="button" onClick={() => void mutate()} disabled={busy || loading || !selected.length} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก...' : `เพิ่มนักเรียนที่เลือก (${selected.length} คน)`}</button>
    </section>;
}
