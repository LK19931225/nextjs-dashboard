import type { ReactNode } from 'react';
import '@/app/ui/global.css';
import { inter } from '@/app/ui/fonts';
import { Metadata } from 'next';

// 该元数据会自动添加到head标签中
export const metadata: Metadata = {
  title: {
    template: '%s | Acme Dashboard', // 模板中的 % 将被替换为具体的页面标题。
    default: 'Acme Dashboard',
  },
  description: 'The official Next.js Learn Dashboard built with App Router.',
  metadataBase: new URL('https://next-learn-dashboard.vercel.sh'),
};
 

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
