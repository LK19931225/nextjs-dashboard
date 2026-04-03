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

4.ORM:对象关系映射
用于在面向对象的编程语言（如 Java, Python, C#）和关系型数据库（如 MySQL, PostgreSQL）之间搭建一座“桥梁”，这个桥梁要解决一个根本性的“阻抗不匹配”问题：

编程语言：以对象为中心。数据是对象，关系是引用（如 user.orders）。
关系型数据库：以表为中心。数据是行和列，关系是外键（如 user_id 列）。

ORM 的核心思想：让你用操作对象的方式（user.save()）去操作数据库（INSERT INTO...），而不必直接编写繁琐的 SQL 语句。

5.streaming:流媒体区块并行渲染，流媒体两种实现方式
a.在页面层面，使用 loading.tsx 文件（它为你创建了 <Suspense>）
b.在组件层面，则有 <Suspense> 进行更细致的控制

6.路由组:使用（）创建路由组
当你用括号 （） 创建新文件夹时，名称不会包含在 URL 路径中。所以 /dashboard/(overview)/page.tsx 变成了 /dashboard。