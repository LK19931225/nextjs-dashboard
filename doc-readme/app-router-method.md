# App Router 数据获取方式详解

> 对应 `pages-router-method.md`，覆盖相同场景，使用 App Router 写法。
> App Router 没有 `getStaticProps` / `getServerSideProps` / `getStaticPaths` 这三个函数，
> 而是通过 **async 组件 + fetch 缓存选项 + 导出常量** 来控制渲染行为。

---

## 概览：Pages Router 函数 → App Router 平替

| Pages Router | App Router 平替 | 说明 |
|-------------|----------------|------|
| `getStaticProps` | `async` 组件 + `fetch`（默认缓存） | 组件本身就是服务端，直接 await |
| ISR `revalidate` | `export const revalidate = N` 或 `fetch(..., { next: { revalidate: N } })` | 模块级或请求级 ISR |
| `getServerSideProps` | `async` 组件 + `fetch({ cache: 'no-store' })` 或 `export const dynamic = 'force-dynamic'` | 每次请求重新获取 |
| `getStaticPaths` | `generateStaticParams()` | 预生成动态路由路径 |
| `fallback: false` | `export const dynamicParams = false` | 未预生成路径 → 404 |
| `fallback: 'blocking'` | `dynamicParams = true`（默认值） | 按需生成，等待完成再返回 |
| `fallback: true`（骨架屏） | `loading.tsx` + `<Suspense>` | 流式渲染，先展示 loading UI |
| `notFound: true` | `notFound()`（from `next/navigation`） | 返回 404 |
| `redirect` | `redirect()`（from `next/navigation`） | 重定向 |
| `context.params` | 组件 `props.params`（需 `await`） | 动态路由参数 |
| `context.query` | 组件 `props.searchParams`（需 `await`） | URL 查询字符串 |
| `context.req.cookies` | `cookies()`（from `next/headers`） | 读取 Cookie |
| `context.req.headers` | `headers()`（from `next/headers`） | 读取请求头 |
| `context.preview` | `draftMode()`（from `next/headers`） | 草稿预览模式 |

---

## 一、对应 `getStaticProps` 的 App Router 写法

### 核心变化

App Router 中，页面组件默认是 **Server Component**（服务端组件），可以直接 `async/await`，
无需导出 `getStaticProps`，数据获取逻辑直接写在组件函数体内。

`fetch` 默认行为（Next.js 15 之前）等价于 `{ cache: 'force-cache' }`，即静态缓存，与 `getStaticProps` 等效。

> ⚠️ **Next.js 15 变化**：`fetch` 默认改为 `no-store`（不缓存），如需静态缓存需显式指定
> `fetch(url, { cache: 'force-cache' })` 或 `export const dynamic = 'force-static'`。

---

### 场景 1：无参数 — 获取静态列表数据

**对应 pages-router 场景**：`pages/blog.tsx` + `getStaticProps`（无 context 参数）

```tsx
// app/blog/page.tsx
// 默认就是 Server Component，直接 async/await，无需任何导出函数

type Post = { id: number; title: string; body: string };

// ISR：模块级声明，整个页面每 60 秒重新生成一次
export const revalidate = 60;

export default async function BlogList() {
  // fetch 在服务端执行，浏览器不可见此请求（同 getStaticProps）
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  const posts: Post[] = await res.json();

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

也可以在 `fetch` 请求级别控制缓存（更细粒度）：

```tsx
// 等效写法：请求级 ISR
const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
  next: { revalidate: 60 }, // 仅此请求 60 秒后重新验证
});
```

---

### 场景 2：读取 `params` — 动态路由详情页

**对应 pages-router 场景**：`pages/blog/[id].tsx` + `context.params.id`

```tsx
// app/blog/[id]/page.tsx
// App Router 中，params 通过组件的 props 传入，无需 context

import { notFound } from 'next/navigation';

type Post = { id: number; title: string; body: string };

// Next.js 15 中 params 是 Promise，需要 await
type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 30;

export default async function BlogDetail({ params }: Props) {
  // 直接从 props 解构，不再需要 context
  // 访问 /blog/42 时，params = { id: '42' }
  const { id } = await params;

  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);

  // 数据不存在，调用 notFound() 返回 404（替代 return { notFound: true }）
  if (!res.ok) {
    notFound();
  }

  const post: Post = await res.json();

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}

// 配合 generateStaticParams 预生成路径（见第三节）
export async function generateStaticParams() {
  return []; // 空数组 + dynamicParams 默认 true = 按需生成（blocking）
}
```

---

### 场景 3：读取文件系统数据

**对应 pages-router 场景**：`pages/docs.tsx` + `getStaticProps` 读取本地文件

```tsx
// app/docs/page.tsx
// Server Component 同样运行在 Node.js 环境，可直接访问文件系统
// 无需通过 getStaticProps 包装，直接在组件体内读取

import fs from 'fs';
import path from 'path';

export default async function Docs() {
  // 与 getStaticProps 完全相同的文件读取逻辑
  const filePath = path.join(process.cwd(), 'README.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  return <pre>{content}</pre>;
}
```

---

### 场景 4：草稿预览模式（Draft Mode）

**对应 pages-router 场景**：`context.preview` + `context.previewData`

Pages Router 的 **Preview Mode** 在 App Router 中升级为 **Draft Mode**，API 改为 `draftMode()`。

```tsx
// app/draft/page.tsx

import { draftMode } from 'next/headers';

export default async function DraftPage() {
  // draftMode() 替代 context.preview / context.previewData
  const { isEnabled } = await draftMode();

  // isEnabled 为 true 时，读取草稿数据；否则读取已发布数据
  const data = isEnabled
    ? await fetchDraft()   // 草稿内容（由 /api/draft 接口开启 Draft Mode）
    : await fetchPublished();

  return <main>{data.content}</main>;
}
```

开启 Draft Mode 的 API 路由（Route Handler）：

```tsx
// app/api/draft/route.ts
import { draftMode } from 'next/headers';

export async function GET() {
  const draft = await draftMode();
  draft.enable(); // 替代 Pages Router 中的 res.setPreviewData()
  return new Response('Draft mode enabled');
}
```

---

## 二、对应 `getServerSideProps` 的 App Router 写法

### 核心变化

让 Server Component 变为"每次请求都重新渲染"有两种方式：

1. 使用 `fetch` 时加 `{ cache: 'no-store' }`（请求级）
2. 页面顶部导出 `export const dynamic = 'force-dynamic'`（页面级，强制动态）

访问请求信息（cookies、headers）通过 `next/headers` 的工具函数获取，
不再需要从 `context.req` 读取。

---

### 场景 1：读取查询字符串 — 分页 / 搜索

**对应 pages-router 场景**：`context.query`（`?keyword=nextjs&page=2`）

```tsx
// app/search/page.tsx
// searchParams 替代 context.query，通过 props 传入
// 使用 searchParams 会自动让页面变为动态渲染（每次请求重新执行）

type Props = {
  searchParams: Promise<{ keyword?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  // Next.js 15 中 searchParams 是 Promise，需要 await
  // 访问 /search?keyword=nextjs&page=2 时：
  // searchParams = { keyword: 'nextjs', page: '2' }
  const { keyword = '', page = '1' } = await searchParams;

  const res = await fetch(
    `https://api.example.com/search?q=${keyword}&page=${page}`,
    { cache: 'no-store' } // 搜索结果不缓存，等同于 getServerSideProps
  );
  const results = await res.json();

  return (
    <div>
      <h1>搜索：{keyword}（第 {page} 页）</h1>
      <ul>{results.map((r: any) => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}
```

---

### 场景 2：读取 Cookie — 鉴权

**对应 pages-router 场景**：`context.req.cookies['auth-token']` + redirect

```tsx
// app/dashboard/page.tsx
// cookies() 替代 context.req.cookies
// redirect() 替代 return { redirect: { destination: '/login' } }

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const cookieStore = await cookies();

  // 读取 Cookie（替代 req.cookies['auth-token']）
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    // 未登录，重定向到登录页（替代 return { redirect: { destination: '/login' } }）
    redirect('/login');
  }

  const user = await verifyTokenAndGetUser(token);

  if (!user) {
    // 替代 return { notFound: true }
    notFound();
  }

  return <h1>欢迎，{user.name}</h1>;
}
```

读取请求头（替代 `context.req.headers`）：

```tsx
import { headers } from 'next/headers';

export default async function Page() {
  const headersList = await headers();

  // 替代 context.req.headers['user-agent']
  const userAgent = headersList.get('user-agent');
  const ip = headersList.get('x-forwarded-for');

  return <div>Your IP: {ip}</div>;
}
```

---

### 场景 3：读取 `params` — 动态路由详情（实时数据）

**对应 pages-router 场景**：`context.params.slug` + 每次请求实时获取

```tsx
// app/products/[slug]/page.tsx
// 通过 cache: 'no-store' 确保每次请求都重新获取（价格库存实时）

import { notFound } from 'next/navigation';

type Product = { slug: string; name: string; price: number; stock: number };

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetail({ params }: Props) {
  // params 通过 props 传入，访问 /products/iphone-15 时：
  // params = { slug: 'iphone-15' }
  const { slug } = await params;

  const res = await fetch(`https://api.example.com/products/${slug}`, {
    cache: 'no-store', // 每次请求都重新获取，等同于 getServerSideProps
  });

  if (!res.ok) {
    notFound(); // 替代 return { notFound: true }
  }

  const product: Product = await res.json();

  return (
    <div>
      <h1>{product.name}</h1>
      <p>价格：¥{product.price}</p>
      <p>库存：{product.stock}</p>
    </div>
  );
}
```

也可以在页面级强制动态（整个页面所有 fetch 都不缓存）：

```tsx
// 替代对每个 fetch 都加 cache: 'no-store'
export const dynamic = 'force-dynamic';
```

---

### 场景 4：控制 CDN 缓存

**对应 pages-router 场景**：`context.res.setHeader('Cache-Control', ...)`

App Router 的 Server Component 无法直接设置响应头。有以下几种等效方案：

**方案 A：使用 `revalidate` 常量（推荐，ISR）**

```tsx
// app/cached-page/page.tsx
// 等同于 Cache-Control: s-maxage=10, stale-while-revalidate=59
export const revalidate = 10; // 页面每 10 秒重新验证一次

export default async function CachedPage() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**方案 B：在 Route Handler 中设置响应头**

```tsx
// app/api/cached-data/route.ts
// 如果需要精确控制 Cache-Control，使用 Route Handler

export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
    },
  });
}
```

**方案 C：在 `next.config.js` 中统一配置**

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/cached-page',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=10, stale-while-revalidate=59' },
        ],
      },
    ];
  },
};
```

---

## 三、对应 `getStaticPaths` 的 App Router 写法

### 核心变化

`getStaticPaths` → `generateStaticParams()`，结构更简洁：
- 不再需要 `{ params: { id: '1' } }` 包装，直接返回 `{ id: '1' }`
- `fallback` 选项改为页面级导出常量 `dynamicParams`

### `dynamicParams` 与 `fallback` 对照

| Pages Router `fallback` | App Router `dynamicParams` | 行为 |
|------------------------|--------------------------|------|
| `false` | `export const dynamicParams = false` | 未预生成路径 → 404 |
| `'blocking'` | `dynamicParams = true`（默认） | 按需在服务端生成，完成后返回 |
| `true`（骨架屏） | `dynamicParams = true` + `loading.tsx` | 先返回 loading UI，流式渲染 |

---

### 场景 1：路径数量少 — 全部预生成

**对应 pages-router 场景**：`getStaticPaths` + `fallback: false`

```tsx
// app/blog/[id]/page.tsx

import { notFound } from 'next/navigation';

type Post = { id: number; title: string; body: string };

// 对应 fallback: false —— 未预生成的路径直接 404
export const dynamicParams = false;

// 替代 getStaticPaths，返回结构更简洁（无需 { params: { id: ... } } 包装）
export async function generateStaticParams() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  const posts: Post[] = await res.json();

  // 直接返回参数对象数组，不需要 { params: { id: '1' } } 包装
  // 注意：值依然必须是字符串
  return posts.map((post) => ({
    id: String(post.id), // 对应文件夹名 [id]
  }));
}

// 数据获取直接写在组件里（替代 getStaticProps）
export default async function BlogDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!res.ok) notFound();

  const post: Post = await res.json();
  return <h1>{post.title}</h1>;
}
```

---

### 场景 2：路径数量多 — 按需生成（对应 `fallback: 'blocking'`）

**对应 pages-router 场景**：`getStaticPaths` + `fallback: 'blocking'`

```tsx
// app/products/[slug]/page.tsx

// dynamicParams 默认就是 true，可省略不写
// 表示：generateStaticParams 未包含的路径，访问时在服务端按需生成
export const dynamicParams = true;

export async function generateStaticParams() {
  // 只预生成热门商品（其余按需生成，行为等同 fallback: 'blocking'）
  const res = await fetch('https://api.example.com/products/top100');
  const products = await res.json();

  return products.map((p: { slug: string }) => ({
    slug: p.slug, // 对应 [slug]
  }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();
  return <h1>{product.name}</h1>;
}
```

---

### 场景 3：多级动态路由

**对应 pages-router 场景**：`pages/docs/[category]/[slug].tsx` 多参数 params

```tsx
// app/docs/[category]/[slug]/page.tsx
// generateStaticParams 直接返回包含所有参数的对象

export async function generateStaticParams() {
  const docs = await fetchAllDocs();

  // 每个对象同时包含 category 和 slug（对应文件夹名）
  return docs.map((doc: { category: string; slug: string }) => ({
    category: doc.category, // 对应 [category]
    slug: doc.slug,         // 对应 [slug]
  }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  // 访问 /docs/react/hooks 时：
  // params = { category: 'react', slug: 'hooks' }
  const { category, slug } = await params;

  const doc = await fetchDoc(category, slug);
  if (!doc) notFound();

  return (
    <article>
      <h1>{doc.title}</h1>
      <div>{doc.content}</div>
    </article>
  );
}
```

---

### 场景 4：`fallback: true` — 骨架屏 / Loading UI

**对应 pages-router 场景**：`fallback: true` + `router.isFallback` 检查

App Router 用 `loading.tsx` 文件 + 流式渲染（Streaming）替代 `isFallback`，
无需在组件内手动判断加载状态，框架自动处理。

```tsx
// app/news/[id]/loading.tsx
// 这个文件自动作为该路由的 loading 状态（替代 router.isFallback 判断）
// 等同于 Pages Router 中的 if (router.isFallback) return <div>加载中...</div>

export default function NewsLoading() {
  return (
    <div>
      {/* 骨架屏 UI */}
      <div className="skeleton-title" />
      <div className="skeleton-body" />
    </div>
  );
}
```

```tsx
// app/news/[id]/page.tsx
// 无需 isFallback 判断，loading.tsx 自动处理加载状态

import { notFound } from 'next/navigation';

// dynamicParams = true（默认），未预生成路径按需生成
export const revalidate = 60;

export async function generateStaticParams() {
  // 构建时不预生成任何路径，全部按需生成
  return [];
}

export default async function NewsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await fetchArticle(id);
  if (!article) notFound(); // 替代 return { notFound: true }

  return (
    <article>
      <h1>{article.title}</h1>
    </article>
  );
}
```

也可以用 `<Suspense>` 在组件粒度控制局部 loading（比 `loading.tsx` 更细）：

```tsx
// app/news/[id]/page.tsx
import { Suspense } from 'react';
import ArticleContent from './article-content';

export default async function NewsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main>
      <h1>新闻详情</h1>
      {/* 仅文章内容部分显示骨架屏，标题立即渲染 */}
      <Suspense fallback={<div>文章加载中...</div>}>
        <ArticleContent id={id} />
      </Suspense>
    </main>
  );
}
```

---

## 四、三者协作完整示例（App Router 版）

**场景与 pages-router 版相同**：
- 电商商品详情页
- 热门商品构建时预生成
- 价格 / 库存每 30 秒 ISR 更新
- 不存在的商品返回 404

```tsx
// app/shop/[productId]/page.tsx

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
};

// 替代 getStaticProps 中的 revalidate: 30
export const revalidate = 30;

// 替代 getStaticPaths —— 预生成热门商品路径
export async function generateStaticParams() {
  const res = await fetch('https://api.example.com/products/hot');
  const hotProducts: Product[] = await res.json();

  // 结构比 getStaticPaths 更简洁，直接返回参数对象
  return hotProducts.map((p) => ({
    productId: p.id, // 对应文件夹名 [productId]
  }));
}

// 动态生成页面 <title>（替代 Pages Router 中 Head 组件）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const product = await fetchProduct(productId);
  return {
    title: product ? product.name : '商品不存在',
  };
}

// 数据获取直接在组件体内完成（替代 getStaticProps）
export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  // 替代 context.params.productId
  // 由 generateStaticParams 预生成，或访问时动态生成（dynamicParams 默认 true）
  const { productId } = await params;

  const res = await fetch(`https://api.example.com/products/${productId}`);

  if (!res.ok) {
    notFound(); // 替代 return { notFound: true }
  }

  const product: Product = await res.json();

  return (
    <main>
      <h1>{product.name}</h1>
      <p>¥{product.price}</p>
      <p>库存：{product.stock}</p>
      <p>{product.description}</p>
    </main>
  );
}
```

加载状态（自动处理，无需 `isFallback`）：

```tsx
// app/shop/[productId]/loading.tsx
export default function ProductLoading() {
  return (
    <main>
      <div className="skeleton h-8 w-64 mb-4" />
      <div className="skeleton h-6 w-32 mb-2" />
      <div className="skeleton h-6 w-24" />
    </main>
  );
}
```

---

## 五、快速记忆口诀

```
getStaticProps       → async 组件直接 await fetch（默认静态缓存）
                       ISR 用 export const revalidate = N

getServerSideProps   → fetch({ cache: 'no-store' })
                       或 export const dynamic = 'force-dynamic'

getStaticPaths       → generateStaticParams()（结构更简洁，无需 params 包裹）
                       fallback 改为 export const dynamicParams = true/false

context.params       → props.params（await params）
context.query        → props.searchParams（await searchParams）
context.req.cookies  → cookies()（from next/headers）
context.req.headers  → headers()（from next/headers）
context.preview      → draftMode()（from next/headers）
return { notFound }  → notFound()（from next/navigation）
return { redirect }  → redirect()（from next/navigation）
router.isFallback    → loading.tsx 或 <Suspense>（框架自动处理）
```
