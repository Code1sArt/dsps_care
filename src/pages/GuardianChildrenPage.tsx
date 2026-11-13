import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParentChildrenManager from '../components/ParentChildrenManager';

export default function GuardianChildrenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="rounded-b-[30px] bg-primary px-6 pb-7 pt-10 text-white shadow-md lg:px-10 lg:pb-8 lg:pt-9">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-white/15 p-2 transition-colors hover:bg-white/25"
            aria-label="กลับหน้าแรก"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold lg:text-2xl">
              <Users size={24} /> ข้อมูลบุตรหลาน
            </h1>
            <p className="mt-1 text-xs text-primary-light">
              ดูพฤติกรรม ประวัติเช็คชื่อ และจัดการนักเรียนในความดูแล
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6 lg:px-10">
        <ParentChildrenManager showViewActions />
      </main>
    </div>
  );
}
