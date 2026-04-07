import SideNav from '@/app/ui/dashboard/sidenav';
import { Metadata } from 'next';

// 为某个特定页面添加自定义标题，会覆盖父页面的元数据
export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="grow p-6 md:overflow-y-auto md:p-12">{children}</div>
    </div>
  );
}