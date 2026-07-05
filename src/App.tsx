import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import liff from '@line/liff';
import toast, { Toaster } from 'react-hot-toast';
import MobileLayout from './components/MobileLayout';
import BindingPage from './pages/BindingPage'; // เดี๋ยวเราจะสร้างหน้านี้
import ProfilePage from './pages/ProfilePage';
import Home from './pages/HomePage';
import AttendancePage from './pages/AttendancePage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import BehaviorPage from './pages/BehaviorPage';
import DevLoginPage from './pages/DevLoginPage';
import { api } from './lib/api';

const liffId = import.meta.env.VITE_LIFF_ID;
const isDevelopment = import.meta.env.DEV;


export default function App() {
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresBinding, setRequiresBinding] = useState(false);
  const [lineUserId, setLineUserId] = useState('');

  useEffect(() => {
    const initLiff = async () => {
      if (isDevelopment) {
        const token = localStorage.getItem('access_token');
        const user = localStorage.getItem('user_data');

        setIsAuthenticated(Boolean(token && user));
        setIsReady(true);
        return;
      }

      try {
        if (!liffId) throw new Error('Missing VITE_LIFF_ID environment variable');
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);

          // ส่ง userId ไปเช็คกับ Backend ทันที
          try {
            const res = await api.post('/auth/line-login', { lineUserId: profile.userId });

            if (res.data.requires_binding) {
              // ยังไม่เคยผูกบัญชี เด้งไปหน้าให้กรอกรหัสผ่าน
              setRequiresBinding(true);
            } else {
              // เคยผูกแล้ว เก็บ Token และให้เข้าใช้งานได้เลย
              localStorage.setItem('access_token', res.data.access_token);
              localStorage.setItem('user_data', JSON.stringify(res.data.user));
              setIsAuthenticated(true);
            }
          } catch (apiError) {
            toast.error('ไม่สามารถเชื่อมต่อระบบโรงเรียนได้');
          }

          setIsReady(true);
        }
      } catch (err: any) {
        setLiffError(err.toString());
      }
    };

    initLiff();
  }, []);


  if (liffError) return <div className="p-10 text-center text-red-500 font-bold">Error: {liffError}</div>;
  if (!isReady) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (isDevelopment && !isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" />
        <DevLoginPage
          onLoginSuccess={(token, user) => {
            localStorage.setItem('access_token', token);
            localStorage.setItem('user_data', JSON.stringify(user));
            setIsAuthenticated(true);
          }}
        />
      </>
    );
  }

  // ถ้าเช็คแล้วว่า "ต้องผูกบัญชี" ให้แสดงแค่หน้า BindingPage เดี่ยวๆ (ไม่มีเมนูด้านล่าง)
  if (requiresBinding && !isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" />
        <BindingPage
          lineUserId={lineUserId}
          onBindSuccess={(token, user) => {
            // เมื่อหน้า Binding ทำงานสำเร็จ จะเรียกฟังก์ชันนี้เพื่อเข้าสู่ระบบ
            localStorage.setItem('access_token', token);
            localStorage.setItem('user_data', JSON.stringify(user));
            setIsAuthenticated(true);
            setRequiresBinding(false);
          }}
        />
      </>
    );




  }
  // ถ้าผูกบัญชีแล้ว ให้เข้าใช้งานระบบหลัก (มีเมนูด้านล่าง)
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* เพิ่ม Route ใหม่ตรงนี้ */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/behavior" element={<BehaviorPage />} />
          <Route path="/history" element={<AttendanceHistoryPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
