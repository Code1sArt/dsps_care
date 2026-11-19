import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
          <section className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg">
            <h1 className="text-xl font-black text-gray-800">เปิด DSPS Care ไม่สำเร็จ</h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              กรุณาลองโหลดแอปใหม่ หากยังพบปัญหาให้ปิดหน้านี้แล้วเปิดจาก LINE อีกครั้ง
            </p>
            <button
              type="button"
              onClick={() => window.location.replace(`${window.location.origin}/`)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
            >
              โหลดใหม่
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
