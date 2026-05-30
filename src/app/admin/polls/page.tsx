import { isAdmin } from '@/lib/admin-auth';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPollsPage() {
  const ok = await isAdmin();
  return (
    <main className="admin-wrap">
      <h1>Beheer — Peilingen</h1>
      {ok ? <AdminDashboard /> : <AdminLogin />}
    </main>
  );
}
