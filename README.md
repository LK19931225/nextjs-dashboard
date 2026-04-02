## Next.js App Router Course - Starter

This is the starter template for the Next.js App Router Course. It contains the starting code for the dashboard application.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.

### app路由
1.app路由使用文件夹，文件夹下放page.tsx文件(类似于react的index.tsx)
2.layout.tsx:创建多个页面共享的UI
3.use client：只要用到「只能在浏览器里跑」或「需要交互状态」的那类 API，就需要 Client 边界。标识组件为客户端组件不是说组件就走CSR，组件依然默认走SSR!如想走CSR,需要关闭SSR,用dynamic
```tsx
import dynamic from 'next/dynamic';
const NavLinks = dynamic(() => import('@/app/ui/dashboard/nav-links').then((m) => m.NavLinks), {
  ssr: false,
  loading: () => <div>可选占位</div>,
});
```
