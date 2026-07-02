import { useState } from 'react';
import { Eye, EyeOff, FlaskConical, Lock, LogIn, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface LoginUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DevLoginPageProps {
  onLoginSuccess: (token: string, user: LoginUser) => void;
}

export default function DevLoginPage({ onLoginSuccess }: DevLoginPageProps) {
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { citizenId, password });
      onLoginSuccess(response.data.access_token, response.data.user);
      toast.success('เข้าสู่ระบบสำหรับทดสอบสำเร็จ');
    } catch (error: any) {
      const message = error.response?.data?.message
        || (error.code === 'ERR_NETWORK'
          ? 'เชื่อมต่อ API ที่ localhost:3000 ไม่ได้ กรุณาเปิด behavior-service'
          : 'เข้าสู่ระบบไม่สำเร็จ');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-accent/25 blur-3xl" />

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-accent text-primary flex items-center justify-center mb-4">
            <FlaskConical size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-gray-800">Local Development</h1>
          <p className="text-xs text-gray-500 mt-2">
            เข้าสู่ระบบเพื่อทดสอบด้วยบัญชีในฐานข้อมูล
          </p>
          <span className="mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            API · localhost:3000
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 ml-1">รหัสประจำตัว</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                required
                autoFocus
                value={citizenId}
                onChange={(event) => setCitizenId(event.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="กรอกรหัสประจำตัว"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 ml-1">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="กรอกรหัสผ่าน"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/25 transition-colors"
          >
            {loading
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><LogIn size={18} /> เข้าสู่ระบบทดสอบ</>}
          </button>
        </form>

        <p className="mt-5 text-[10px] leading-relaxed text-center text-gray-400">
          หน้านี้แสดงเฉพาะตอนรัน development และจะไม่ถูกรวมในขั้นตอนเข้าสู่ระบบของ production
        </p>
      </div>
    </div>
  );
}
