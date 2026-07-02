import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    Home, User, ClipboardList,
    ShieldCheck, History
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
        <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-xl relative pb-[72px] overflow-hidden">

            <div className="h-full overflow-y-auto">
                <Outlet />
            </div>

            {/* แถบเมนูด้านล่าง (ปรับ padding และ gap ให้รองรับได้สูงสุด 6 เมนู) */}
            <div className="fixed sm:absolute bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-2 py-2 flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.05)]">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-primary/10 scale-110' : ''}`}>
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
