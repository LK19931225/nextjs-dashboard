# Next.js Pages Router vs App Router 对比

## 一、核心理念差异

| 维度 | Pages Router | App Router |
|------|-------------|------------|
| 路由单位 | **文件**（`pages/about.tsx` → `/about`） | **文件夹**（`app/about/page.tsx` → `/about`） |
| 默认组件类型 | 客户端组件（Client Component） | **服务端组件（Server Component）** |
| React 版本 | 项目 `package.json` 里的版本 | 内置 React Canary（含 React 19 特性） |
| 数据获取方式 | 通过导出特定函数（`getStaticProps` 等） | 直接在 `async` 组件中 `await` |

---

## 二、数据获取 API 平替对照

### 1. 静态生成（SSG）

**平替关系**：`getStaticProps` → `async` 服务端组件 + `fetch`（默认 `cache: 'force-cache'`）

```tsx
// ===== Pages Router =====
// pages/posts.tsx
export async function getStaticProps() {
  const data = await fetchData();
  return { props: { data } };
}
export default function Posts({ data }) { ... }
```

```tsx
// ===== App Router 平替 =====
// app/posts/page.tsx（默认就是 Server Component，默认静态缓存）
export default async function Posts() {
  const data = await fetchData(); // 直接 await，无需导出函数
  return <div>{data}</div>;
}
```

---

### 2. 服务端渲染（SSR）

**平替关系**：`getServerSideProps` → `async` 服务端组件 + `fetch({ cache: 'no-store' })`

```tsx
// ===== Pages Router =====
export async function getServerSideProps(context) {
  const data = await fetchData(context.params.id);
  return { props: { data } };
}
```

```tsx
// ===== App Router 平替 =====
// app/posts/[id]/page.tsx
export default async function Post({ params }) {
  // 对 fetch 指定不缓存，等同于 SSR（每次请求都重新获取）
  const data = await fetch('/api/data', { cache: 'no-store' });
  return <div>{data}</div>;
}
```

---

### 3. 动态路由静态路径生成

**平替关系**：`getStaticPaths` → `generateStaticParams`

```tsx
// ===== Pages Router =====
export async function getStaticPaths() {
  return {
    paths: [{ params: { id: '1' } }, { params: { id: '2' } }],
    fallback: false,
  };
}
```

```tsx
// ===== App Router 平替 =====
// app/posts/[id]/page.tsx
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }];
}
```

---

### 4. 客户端渲染（CSR）

**平替关系**：直接 `useEffect` 写法 → `'use client'` + `useEffect`（如想完全走 CSR 还可以用 `dynamic({ ssr: false })`）

```tsx
// ===== Pages Router =====
// 不导出任何数据函数，直接用 useEffect
import { useState, useEffect } from 'react';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
  return <div>{data}</div>;
}
```

```tsx
// ===== App Router 平替 =====
'use client';
import { useState, useEffect } from 'react';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
  return <div>{data}</div>;
}
```

---

## 三、渲染方式汇总对比

| 方法 | 运行环境 | 执行时机 | 数据新鲜度 | 对 SEO 的影响 | 能否访问浏览器 API |
|------|---------|---------|-----------|-------------|-----------------|
| `getServerSideProps` | 服务端（每次请求） | 每次页面请求时 | 实时（每次请求都重新获取） | 良好（完整 HTML 包含数据） | ❌ 不能 |
| `getStaticProps` | 服务端（构建时） | 项目构建时运行一次（或 ISR 定期重新生成） | 构建时的数据（可配合 ISR 更新） | 最佳（完全静态 HTML） | ❌ 不能 |
| `getStaticPaths` | 服务端（构建时） | 与 `getStaticProps` 配合，用于动态路由的静态生成 | — | — | ❌ 不能 |
| `useEffect` + 客户端 API 请求 | 浏览器 | 组件挂载后（页面已展示，然后异步请求数据并更新 UI） | 实时（但首屏看不到数据） | 差（首屏无数据，需要客户端渲染） | ✅ 可以 |

---

## 四、页面特殊文件 API 对照

| 功能 | Pages Router | App Router |
|------|-------------|------------|
| 页面入口 | `pages/about.tsx`（文件即路由） | `app/about/page.tsx` |
| 全局布局 | `pages/_app.tsx` | `app/layout.tsx` |
| 自定义 HTML 结构 | `pages/_document.tsx` | `app/layout.tsx`（直接写 `<html><body>`） |
| 加载状态 | 手动实现 | `loading.tsx`（自动包裹 `<Suspense>`） |
| 错误边界 | 手动实现 | `error.tsx` |
| 404 页面 | `pages/404.tsx` | `app/not-found.tsx` |
| API 路由 | `pages/api/hello.ts` | `app/api/hello/route.ts`（Route Handler） |

---

## 五、API 路由变化

```tsx
// ===== Pages Router =====
// pages/api/hello.ts
export default function handler(req, res) {
  res.status(200).json({ name: 'John' });
}
```

```tsx
// ===== App Router 平替 =====
// app/api/hello/route.ts
export async function GET(request: Request) {
  return Response.json({ name: 'John' });
}
// 支持具名导出：GET / POST / PUT / DELETE / PATCH
```

---

## 六、元数据（SEO）

**平替关系**：`next/head` 里的 `<Head>` → `export const metadata` 或 `generateMetadata()`

```tsx
// ===== Pages Router =====
import Head from 'next/head';
export default function Page() {
  return (
    <>
      <Head><title>My Page</title></Head>
      <main>...</main>
    </>
  );
}
```

```tsx
// ===== App Router 平替（静态元数据）=====
export const metadata = { title: 'My Page', description: '...' };

// ===== App Router 平替（动态元数据）=====
export async function generateMetadata({ params }) {
  return { title: `Post ${params.id}` };
}
```

---

## 七、路由导航 Hook 对照

| 功能 | Pages Router | App Router |
|------|-------------|------------|
| 引入来源 | `next/router` | `next/navigation` |
| 获取路由对象 | `useRouter`（含 query、pathname 等） | `useRouter`（功能精简，仅用于跳转） |
| 获取路径参数 | `router.query` | `useParams()` |
| 获取查询字符串 | `router.query` | `useSearchParams()` |
| 获取当前路径 | `router.pathname` | `usePathname()` |

> ⚠️ **注意**：App Router 的 `useRouter` 从 `next/navigation` 引入，不再包含 `query`，功能被拆分到多个独立 hook。

---

## 八、一句话总结渲染模式选择

```
Pages Router：通过导出特定函数来"声明"渲染方式
  - getStaticProps          → SSG（构建时静态生成）
  - getServerSideProps      → SSR（每次请求服务端渲染）
  - 什么都不导出            → CSR（客户端渲染）

App Router：通过组件位置和 fetch 选项来"控制"渲染方式
  - 默认 async 组件                → Server Component（静态缓存）
  - fetch({ cache: 'no-store' })   → 等同 SSR（每次请求重新获取）
  - 'use client' + useEffect       → CSR（客户端渲染）
  - loading.tsx + Suspense         → Streaming SSR（流式渲染）
```
