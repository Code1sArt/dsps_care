import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    Home, User, ClipboardList,
    ShieldCheck, History, GraduationCap
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export default function MobileLayout() {
    const location = useLocation();
    const [userRole, setUserRole] = useState<string>('');

    // ดึง Role จาก LocalStorage ทันทีที่โหลด Layout นี้
    useEffect(() => {
        const userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
            const user = JSON.parse(userDataStr);
            setUserRole(user.role || '');
        }
    }, []);

    // ใช้ useMemo กรองเมนูตาม Role 
    const navItems = useMemo(() => {
        // กำหนดเมนูทั้งหมด และระบุว่าใครเห็นได้บ้าง
        const allMenus = [
            { path: '/', icon: Home, label: 'หน้าแรก', roles: ['ALL'] },

            // เมนูเฉพาะครู / Admin
            { path: '/attendance', icon: ClipboardList, label: 'เช็คชื่อ', roles: ['TEACHER', 'ADMIN'] },

            // เมนูใหม่ (นักเรียน ผู้ปกครอง และครู เห็นเหมือนกันหมด)
            { path: '/behavior', icon: ShieldCheck, label: 'พฤติกรรม', roles: ['ALL'] },
            { path: '/history', icon: History, label: 'ประวัติ', roles: ['ALL'] },

            { path: '/profile', icon: User, label: 'โปรไฟล์', roles: ['ALL'] },
        ];

        // กรองเอาเฉพาะเมนูที่ Role 'ALL' หรือ Role ตรงกับผู้ใช้งาน
        return allMenus.filter(menu =>
            menu.roles.includes('ALL') || menu.roles.includes(userRole)
        );
    }, [userRole]);

    return (
        <div className="max-w-md lg:max-w-none mx-auto bg-gray-50 min-h-screen shadow-xl lg:shadow-none relative pb-[72px] lg:pb-0 lg:pl-64 overflow-hidden">

            {/* Sidebar สำหรับแท็บเล็ตแนวนอนและเดสก์ท็อป */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-primary text-white z-50 flex-col shadow-2xl shadow-primary/20">
                <div className="h-24 px-6 flex items-center gap-3 border-b border-white/10">
                    <div className="w-11 h-11 rounded-2xl bg-accent text-primary flex items-center justify-center shadow-lg shadow-black/10">
                        <GraduationCap size={25} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="font-black text-lg leading-tight">DSPS Care</p>
                        <p className="text-[10px] text-white/65 mt-1">โรงเรียนเทพศิรินทร์พุแค สระบุรี</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <p className="px-3 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">เมนูหลัก</p>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                                    isActive
                                        ? 'bg-accent text-primary shadow-lg shadow-black/10'
                                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.7 : 2} />
                                <span className="text-sm font-bold">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-5">
                    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
                        <p className="text-xs font-bold text-accent">DSPS Care</p>
                        <p className="text-[10px] leading-relaxed text-white/60 mt-1">ที่แห่งนี้ดูแลเหมือนครอบครัว</p>
                    </div>
                </div>
            </aside>

            <main className="min-h-screen overflow-y-auto">
                <Outlet />
            </main>

            {/* แถบเมนูด้านล่าง (ปรับ padding และ gap ให้รองรับได้สูงสุด 6 เมนู) */}
            <div className="fixed lg:hidden bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-2 py-2 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)]">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-accent scale-110 shadow-sm' : ''}`}>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : ''} />
                            </div>
                            <span className={`text-[9px] sm:text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
