import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { api } from '../lib/api';
import type { SelectedParentStudent } from '../lib/parentStudentLinks';
interface ResolvedRoom {
    classroom: { id: number; name: string };
    students: { id: string; firstName: string; lastName: string }[];
}

export default function ParentStudentPicker({ value, onChange, disabled = false }: {
    value: SelectedParentStudent[];
    onChange: (students: SelectedParentStudent[]) => void;
    disabled?: boolean;
}) {
    const [code, setCode] = useState('');
    const [room, setRoom] = useState<ResolvedRoom | null>(null);
    const [resolvedCode, setResolvedCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);
    const lookup = async () => {
        if (inFlight.current || disabled) return;
        const invitationCode = code.trim();
        if (!/^[a-zA-Z0-9]{5}$/.test(invitationCode)) { setError('กรุณากรอกรหัสห้อง 5 ตัวอักษรให้ตรงกับที่โรงเรียนแจ้ง'); return; }
        inFlight.current = true;
        const controller = new AbortController();
        request.current = controller;
        setLoading(true); setError(''); setRoom(null);
        try {
            const response = await api.post<ResolvedRoom>('/parents/classroom-invitations/resolve', { invitationCode }, { signal: controller.signal });
            if (controller.signal.aborted) return;
            setRoom(response.data); setResolvedCode(invitationCode);
            onChange(value.map(student => student.classroomId === response.data.classroom.id ? { ...student, invitationCode } : student));
        } catch (error: unknown) {
            if (controller.signal.aborted) return;
            const message: unknown = isAxiosError(error) ? error.response?.data?.message : undefined;
            setError(typeof message === 'string' ? message : 'โหลดรายชื่อไม่สำเร็จ กรุณาลองอีกครั้ง');
        } finally { inFlight.current = false; if (!controller.signal.aborted) setLoading(false); }
    };
    return <fieldset disabled={disabled || loading} className="space-y-3 rounded-2xl border border-gray-200 p-4 disabled:opacity-60">
        <legend className="px-1 text-sm font-bold text-gray-800">เลือกนักเรียนในความดูแล</legend>
        <label className="block text-xs font-medium text-gray-600">รหัสห้อง 5 ตัว
            <input autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={5} value={code} onChange={event => { setCode(event.target.value); setRoom(null); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void lookup(); } }} placeholder="เช่น aB3xY" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-lg tracking-widest" />
        </label>
        <button type="button" onClick={() => void lookup()} className="w-full rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary">{loading ? 'กำลังโหลดรายชื่อ...' : 'แสดงรายชื่อนักเรียน'}</button>
        <p className="text-xs leading-5 text-gray-500">กรอกตัวพิมพ์เล็ก–ใหญ่ให้ตรงกัน หากมีนักเรียนต่างห้อง สามารถกรอกรหัสห้องอื่นแล้วเลือกเพิ่มได้</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {room && <div>
            <p className="mb-2 text-sm font-bold text-gray-700">ห้อง {room.classroom.name}</p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
                {room.students.map(student => <label key={student.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-sm">
                    <input type="checkbox" checked={value.some(selected => selected.studentId === student.id)} onChange={event => {
                        if (event.target.checked) {
                            if (value.length >= 100) { setError('เลือกนักเรียนได้ไม่เกิน 100 คน'); return; }
                            onChange([...value, { studentId: student.id, invitationCode: resolvedCode, firstName: student.firstName, lastName: student.lastName, classroomId: room.classroom.id, classroomName: room.classroom.name }]);
                        } else onChange(value.filter(selected => selected.studentId !== student.id));
                    }} className="h-4 w-4 accent-primary" />
                    {student.firstName} {student.lastName}
                </label>)}
                {room.students.length === 0 && <p className="text-sm text-gray-500">ไม่มีนักเรียนที่ยังว่างสำหรับเชื่อมโยงในห้องนี้</p>}
            </div>
        </div>}
        {value.length > 0 && <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-sm font-bold text-primary">เลือกแล้ว {value.length} คน</p>
            {value.map(student => <div key={student.studentId} className="flex items-center justify-between gap-2 text-sm text-gray-700"><span>{student.firstName} {student.lastName} · {student.classroomName}</span><button type="button" onClick={() => onChange(value.filter(item => item.studentId !== student.studentId))} aria-label={`ยกเลิกเลือก ${student.firstName} ${student.lastName}`} className="shrink-0 p-1 text-red-600">นำออก</button></div>)}
        </div>}
    </fieldset>;
}
