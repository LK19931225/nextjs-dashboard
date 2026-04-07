## Next.js App Router Course - Starter

This is the starter template for the Next.js App Router Course. It contains the starting code for the dashboard application.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.

### 1.app路由与传统page路由的区别
app路由使用文件夹，文件夹下放page.tsx文件(类似于react的index.tsx)

#### 2.layout布局
layout.tsx:创建多个页面共享的UI

#### 3。客户端组件与服务端组件
use client：只要用到「只能在浏览器里跑」或「需要交互状态」的那类 API，就需要 Client 边界。标识组件为客户端组件不是说组件就走CSR，组件依然默认走SSR!如想走CSR,需要关闭SSR,用dynamic
```tsx
import dynamic from 'next/dynamic';
const NavLinks = dynamic(() => import('@/app/ui/dashboard/nav-links').then((m) => m.NavLinks), {
  ssr: false,
  loading: () => <div>可选占位</div>,
});
```

客户端组件，意味着你可以使用事件监听器和钩子,这在服务端渲染的组件中，不能使用。

#### 4.何为ORM
ORM:对象关系映射
用于在面向对象的编程语言（如 Java, Python, C#）和关系型数据库（如 MySQL, PostgreSQL）之间搭建一座“桥梁”，这个桥梁要解决一个根本性的“阻抗不匹配”问题：
编程语言：以对象为中心。数据是对象，关系是引用（如 user.orders）。
关系型数据库：以表为中心。数据是行和列，关系是外键（如 user_id 列）。

ORM 的核心思想：让你用操作对象的方式（user.save()）去操作数据库（INSERT INTO...），而不必直接编写繁琐的 SQL 语句。

#### 5.组件加载的suspense
5.streaming:流媒体区块并行渲染，流媒体两种实现方式
a.在页面层面，使用 loading.tsx 文件（它为你创建了 <Suspense>）---整页
b.在组件层面，则有 <Suspense> 进行更细致的控制 ----- 组件某一个部分区域

streaming能帮助你创造更愉快的用户体验

#### 6.路由分组
6.路由组:使用（）创建路由组
当你用括号 （） 创建新文件夹时，名称不会包含在 URL 路径中。所以 /dashboard/(overview)/page.tsx 变成了 /dashboard。

#### 7.动态路由
7.使用[]创建动态路由

#### 8.错误边界与404路由
8.使用error.tsx处理错误边界，使用not-found.tsx处理404,notFound 会优先于 error.tsx

#### 9.元数据
元数据:提供关于网页的额外细节,用户不可见，幕后工作。元数据在提升网页 SEO 方面起着重要作用.
a.常见的元数据有title标签和meta标签
b.元数据在layout.tsx或page.tsx中定义

html中常见的元数据

```tsx
// 标题元数据 ：负责浏览器标签页上显示网页标题的部分。这对 SEO 至关重要，因为它帮助搜索引擎了解网页的内容。
<title>Page Title</title>

// 描述元数据 ：这些元数据简要介绍网页内容，通常会在搜索引擎结果中显示。
<meta name="description" content="A brief description of the page content." />

// 关键词元数据 ：该元数据包含与网页内容相关的关键词，帮助搜索引擎索引页面。
<meta name="keywords" content="keyword1, keyword2, keyword3" />

// 开放图元数据 ：该元数据增强了网页在社交媒体平台上分享时的呈现方式，提供标题、描述和预览图片等信息。
<meta property="og:title" content="Title Here" />
<meta property="og:description" content="Description Here" />
<meta property="og:image" content="image_url_here" />

// Favicon 元数据 ：该元数据将 favicon（一个小图标）链接到浏览器地址栏或标签页中显示的网页。
<link rel="icon" href="path/to/favicon.ico" />
```