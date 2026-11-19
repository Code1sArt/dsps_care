import PhotographyPage from './pages/PhotographyPage';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import liff from '@line/liff';
import { Toaster } from 'react-hot-toast';
import MobileLayout from './components/MobileLayout';
import BindingPage from './pages/BindingPage'; // เดี๋ยวเราจะสร้างหน้านี้
import ProfilePage from './pages/ProfilePage';
import Home from './pages/HomePage';
import AttendancePage from './pages/AttendancePage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import BehaviorPage from './pages/BehaviorPage';
import BehaviorManagePage from './pages/BehaviorManagePage';
import ClassroomStatsPage from './pages/ClassroomStatsPage';
import StudentListPage from './pages/StudentListPage';
import DevLoginPage from './pages/DevLoginPage';
import StaffAttendancePage from './pages/StaffAttendancePage';
import GuardianChildrenPage from './pages/GuardianChildrenPage';
import { publicApi } from './lib/api';

const liffId = import.meta.env.VITE_LIFF_ID;
const isDevelopment = import.meta.env.DEV;
const LIFF_INIT_TIMEOUT_MS = 20_000;

function getLineLoginRedirectUri() {
  // Always return from LINE Login to the LIFF endpoint. Reusing the current URL
  // can send a mobile user back to a temporary liff.state/client-side route and
  // result in an Apache 404 before React has a chance to start.
  return new URL('/', window.location.origin).toString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('ใช้เวลาเชื่อมต่อ LINE นานเกินไป'));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function LoginErrorPage({ message }: { message: string }) {
  const retry = () => {
    window.location.replace(getLineLoginRedirectUri());
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
      <section className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-8 shadow-lg">
        <img src="/school-logo.png" alt="DSPS Care" className="mx-auto h-20 w-20 object-contain" />
        <h1 className="mt-5 text-xl font-black text-gray-800">เชื่อมต่อ LINE ไม่สำเร็จ</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
        >
          ลองเข้าใหม่อีกครั้ง
        </button>
        <p className="mt-4 text-xs leading-5 text-gray-400">
          หากยังเข้าไม่ได้ กรุณาปิดหน้านี้ แล้วเปิด DSPS Care จากเมนูใน LINE อีกครั้ง
        </p>
      </section>
    </main>
  );
}

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
        await withTimeout(liff.init({ liffId }), LIFF_INIT_TIMEOUT_MS);

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: getLineLoginRedirectUri() });
          return;
        }

        const accessToken = liff.getAccessToken();
        if (!accessToken) throw new Error('LINE ไม่ได้ส่งข้อมูลยืนยันตัวตนกลับมา');

        const profile = await withTimeout(liff.getProfile(), LIFF_INIT_TIMEOUT_MS);
        setLineUserId(profile.userId);

        // ส่ง userId ไปเช็คกับ Backend ทันที
        const res = await withTimeout(
          publicApi.post('/auth/line-login', {
            lineUserId: profile.userId,
            accessToken,
          }),
          LIFF_INIT_TIMEOUT_MS,
        );

        if (res.data.requires_binding) {
          // ยังไม่เคยผูกบัญชี เด้งไปหน้าให้กรอกรหัสผ่าน
          setRequiresBinding(true);
        } else {
          // เคยผูกแล้ว เก็บ Token และให้เข้าใช้งานได้เลย
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('user_data', JSON.stringify(res.data.user));
          setIsAuthenticated(true);
        }

        setIsReady(true);
      } catch (err: unknown) {
        console.error('LIFF initialization failed', err);
        setLiffError(err instanceof Error ? err.message : String(err));
      }
    };

    initLiff();
  }, []);

  if (liffError) return <LoginErrorPage message={liffError} />;
  if (!isReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="text-sm font-bold text-gray-500">กำลังเชื่อมต่อ LINE...</p>
      </div>
    );
  }

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
          <Route path="/photography" element={<PhotographyPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* เพิ่ม Route ใหม่ตรงนี้ */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/behavior" element={<BehaviorPage />} />
          <Route path="/behavior-manage" element={<BehaviorManagePage />} />
          <Route path="/stats" element={<ClassroomStatsPage />} />
          <Route path="/student-list" element={<StudentListPage />} />
          <Route path="/history" element={<AttendanceHistoryPage />} />
          <Route path="/staff-attendance" element={<StaffAttendancePage />} />
          <Route path="/children" element={<GuardianChildrenPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
