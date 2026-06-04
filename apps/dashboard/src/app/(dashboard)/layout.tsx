import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-naty-dark text-white">
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
