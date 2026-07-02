import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import toast from 'react-hot-toast';
import {
    User, Shield, Lock, LogOut, Edit2,
    Check, X, Camera, KeyRound
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { api } from '../lib/api';

export default function ProfilePage() {
    const navigate = useNavigate();

    // States สำหรับข้อมูล
    const [userData, setUserData] = useState<any>(null);
    const [lineAvatar, setLineAvatar] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // States สำหรับการแก้ไขข้อมูลส่วนตัว
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });

    // States สำหรับการเปลี่ยนรหัสผ่าน
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            // 1. ดึงข้อมูลรูปภาพจาก LINE LIFF
            if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                if (profile.pictureUrl) setLineAvatar(profile.pictureUrl);
            }

            // 2. ดึงข้อมูลส่วนตัวจาก Backend (/users/me)
            const res = await api.get('/users/me');
            setUserData(res.data);
            setEditForm({
                firstName: res.data.firstName,
                lastName: res.data.lastName
            });
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editForm.firstName || !editForm.lastName) return toast.error('กรุณากรอกข้อมูลให้ครบ');
        const toastId = toast.loading('กำลังบันทึกข้อมูล...');

        try {
            // 🚨 สมมติว่า Backend ใช้เส้น PUT /users/me สำหรับอัปเดตข้อมูล
            const res = await api.put('/users/me', editForm);
            setUserData({ ...userData, ...res.data });
            setIsEditingProfile(false);

            // อัปเดตข้อมูลใน LocalStorage ด้วย
            const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
            localStorage.setItem('user_data', JSON.stringify({ ...storedUser, ...editForm }));

            toast.success('บันทึกข้อมูลสำเร็จ', { id: toastId });
        } catch (error) {
            toast.error('ไม่สามารถบันทึกข้อมูลได้', { id: toastId });
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
        }

        const toastId = toast.loading('กำลังเปลี่ยนรหัสผ่าน...');
        try {
            // 🚨 สมมติว่า Backend ใช้เส้น PUT /users/me/password
            await api.put('/users/me/password', {
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword
            });

            toast.success('เปลี่ยนรหัสผ่านสำเร็จ', { id: toastId });
            setIsPasswordModalOpen(false);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            const msg = error.response?.data?.message || 'รหัสผ่านเดิมไม่ถูกต้อง';
            toast.error(msg, { id: toastId });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        navigate('/');
        window.location.reload(); // รีเฟรชเพื่อเคลียร์ State และให้กลับไปหน้า Login/Binding
    };

    // ตัวแปลง Role เป็นภาษาไทย
    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            ADMIN: 'ผู้ดูแลระบบ',
            TEACHER: 'คุณครู',
            PARENT: 'ผู้ปกครอง',
            STUDENT: 'นักเรียน'
        };
        return roles[role] || role;
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Cover Profile */}
            <div className="h-32 lg:h-44 bg-gradient-to-r from-primary-dark to-primary relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <div className="relative">
                        {lineAvatar ? (
                            <img src={lineAvatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white" />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-200 flex items-center justify-center">
                                <User size={40} className="text-gray-400" />
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
                            <Camera size={14} className="text-gray-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="pt-16 px-6 pb-6 text-center lg:pt-14">
                <h2 className="text-2xl font-bold text-gray-800">
                    {userData?.firstName} {userData?.lastName}
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-primary">
                    <Shield size={16} />
                    <span className="font-semibold text-sm">{getRoleLabel(userData?.role)}</span>
                </div>
            </div>

            {/* Actions & Forms */}
            <div className="px-6 space-y-4 lg:max-w-4xl lg:mx-auto lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0">

                {/* Card: ข้อมูลส่วนตัว */}
                <div className="bg-white p-5 lg:p-7 rounded-2xl shadow-sm border border-gray-100 lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <User size={18} className="text-primary" /> ข้อมูลส่วนตัว
                        </h3>
                        {!isEditingProfile ? (
                            <button onClick={() => setIsEditingProfile(true)} className="p-2 text-gray-400 hover:text-primary transition-colors bg-gray-50 rounded-xl">
                                <Edit2 size={16} />
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditingProfile(false)} className="p-2 text-red-500 bg-red-50 rounded-xl"><X size={16} /></button>
                                <button onClick={handleUpdateProfile} className="p-2 text-green-600 bg-green-50 rounded-xl"><Check size={16} /></button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 font-medium">รหัสประจำตัว (แก้ไขไม่ได้)</label>
                            <input type="text" disabled value={userData?.citizenId} className="w-full mt-1 px-3 py-2 bg-gray-100 border-none rounded-xl text-sm text-gray-500 font-mono" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">ชื่อ</label>
                                <input
                                    type="text"
                                    disabled={!isEditingProfile}
                                    value={isEditingProfile ? editForm.firstName : userData?.firstName}
                                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                    className={`w-full mt-1 px-3 py-2 rounded-xl text-sm transition-all ${isEditingProfile ? 'bg-white border border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-gray-800' : 'bg-gray-50 border-none text-gray-600'}`}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">นามสกุล</label>
                                <input
                                    type="text"
                                    disabled={!isEditingProfile}
                                    value={isEditingProfile ? editForm.lastName : userData?.lastName}
                                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                    className={`w-full mt-1 px-3 py-2 rounded-xl text-sm transition-all ${isEditingProfile ? 'bg-white border border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-gray-800' : 'bg-gray-50 border-none text-gray-600'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2 lg:self-start">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50"
                    >
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="p-2 bg-accent-soft text-primary rounded-xl"><KeyRound size={18} /></div>
                            <span className="font-medium text-sm">เปลี่ยนรหัสผ่าน</span>
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><LogOut size={18} /></div>
                            <span className="font-medium text-sm">ออกจากระบบ</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* --- Modal: เปลี่ยนรหัสผ่าน --- */}
            <Transition appear show={isPasswordModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsPasswordModalOpen(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                                        <Lock size={20} className="text-primary" /> เปลี่ยนรหัสผ่าน
                                    </Dialog.Title>
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่านปัจจุบัน</label>
                                            <input required type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary/50 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                                            <input required type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary/50 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                                            <input required type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary/50 text-sm" />
                                        </div>
                                        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-gray-100">
                                            <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">ยกเลิก</button>
                                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark">บันทึก</button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
