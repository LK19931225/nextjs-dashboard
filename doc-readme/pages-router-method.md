# Pages Router 三大数据获取函数详解

## 概览

| 函数 | 执行时机 | 适用场景 |
|------|---------|---------|
| `getStaticProps` | 构建时（Build Time） | 数据不频繁变化，追求最佳性能 |
| `getServerSideProps` | 每次请求时（Runtime） | 数据需要实时更新，或依赖请求信息 |
| `getStaticPaths` | 构建时，配合 `getStaticProps` | 动态路由页面的静态生成 |

---

## 一、`getStaticProps`

### 函数签名

```ts
export async function getStaticProps(context: GetStaticPropsContext) {
  return {
    props: {},        // 传给页面组件的数据（必填）
    revalidate: 60,   // ISR：多少秒后重新生成（可选）
    notFound: true,   // 返回 404 页面（可选）
    redirect: {       // 重定向（可选）
      destination: '/other-page',
      permanent: false,
    },
  };
}
```

### `context` 参数字段详解

| 字段 | 类型 | 说明 |
|------|------|------|
| `context.params` | `object \| undefined` | 动态路由参数，仅在配合 `getStaticPaths` 时有值 |
| `context.locale` | `string \| undefined` | 当前语言（需开启 i18n） |
| `context.locales` | `string[] \| undefined` | 所有支持的语言列表 |
| `context.defaultLocale` | `string \| undefined` | 默认语言 |
| `context.preview` | `boolean \| undefined` | 是否处于预览模式 |
| `context.previewData` | `any` | 预览模式携带的数据 |

---

### 场景 1：无参数 — 获取静态列表数据

```tsx
// pages/blog.tsx
// 场景：博客列表页，数据来自 CMS，不需要任何路由参数
// context 几乎用不到，直接忽略即可

import type { GetStaticProps } from 'next';

type Post = { id: number; title: string; body: string };

type Props = { posts: Post[] };

export default function BlogList({ posts }: Props) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  // 调用外部 API（构建时执行，浏览器不可见此请求）
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  const posts: Post[] = await res.json();

  return {
    props: { posts },
    revalidate: 60, // ISR：每隔 60 秒重新生成该页面
  };
};
```

---

### 场景 2：读取 `context.params` — 动态路由详情页

```tsx
// pages/blog/[id].tsx
// 场景：博客详情页，URL 是 /blog/1、/blog/2...
// context.params.id 就是 URL 里的 [id] 部分

import type { GetStaticProps } from 'next';

type Post = { id: number; title: string; body: string };

export default function BlogDetail({ post }: { post: Post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  // context.params 的值来自文件名 [id]
  // 访问 /blog/42 时，context.params = { id: '42' }
  const { id } = context.params!;

  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);

  // 如果数据不存在，返回 404
  if (!res.ok) {
    return { notFound: true };
  }

  const post: Post = await res.json();

  return {
    props: { post },
    revalidate: 30,
  };
};

// 必须配合 getStaticPaths 使用（见第三节）
export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}
```

---

### 场景 3：读取文件系统数据

```tsx
// pages/docs.tsx
// 场景：从本地 markdown 文件读取内容（getStaticProps 可以访问 Node.js 文件系统）

import fs from 'fs';
import path from 'path';
import type { GetStaticProps } from 'next';

export default function Docs({ content }: { content: string }) {
  return <pre>{content}</pre>;
}

export const getStaticProps: GetStaticProps = async () => {
  // 读取项目根目录下的 README.md
  const filePath = path.join(process.cwd(), 'README.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  return {
    props: { content },
  };
};
```

---

### 场景 4：预览模式（Preview Mode）

```tsx
// pages/draft.tsx
// 场景：CMS 编辑预览，通过 preview 和 previewData 区分是否展示草稿

import type { GetStaticProps } from 'next';

export const getStaticProps: GetStaticProps = async (context) => {
  const { preview, previewData } = context;

  // preview 为 true 时，读取草稿数据；否则读取已发布数据
  const data = preview
    ? await fetchDraft(previewData) // previewData 由 /api/preview 接口写入
    : await fetchPublished();

  return { props: { data } };
};
```

---

## 二、`getServerSideProps`

### 函数签名

```ts
export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {},       // 传给页面组件的数据（必填）
    notFound: true,  // 返回 404（可选）
    redirect: {      // 重定向（可选）
      destination: '/login',
      permanent: false,
    },
  };
}
```

### `context` 参数字段详解

| 字段 | 类型 | 说明 |
|------|------|------|
| `context.params` | `object \| undefined` | 动态路由参数（同 `getStaticProps`） |
| `context.query` | `object` | URL 查询字符串，如 `?page=2&sort=asc` |
| `context.req` | `IncomingMessage` | 原生 HTTP 请求对象，可读取 headers、cookies |
| `context.res` | `ServerResponse` | 原生 HTTP 响应对象，可设置响应头 |
| `context.resolvedUrl` | `string` | 实际解析后的 URL 路径（含查询字符串） |
| `context.locale` | `string \| undefined` | 当前语言 |
| `context.locales` | `string[] \| undefined` | 所有语言列表 |
| `context.defaultLocale` | `string \| undefined` | 默认语言 |

> `getServerSideProps` 的 `context` 比 `getStaticProps` 多了 `req`、`res`、`query` 三个关键字段，因为它在每次请求时执行，能拿到完整的请求信息。

---

### 场景 1：读取 `context.query` — 分页 / 搜索

```tsx
// pages/search.tsx
// 场景：搜索结果页，URL 形如 /search?keyword=nextjs&page=2
// 必须用 getServerSideProps，因为每次搜索的参数不同

import type { GetServerSideProps } from 'next';

type Props = { results: any[]; keyword: string; page: number };

export default function SearchPage({ results, keyword, page }: Props) {
  return (
    <div>
      <h1>搜索：{keyword}（第 {page} 页）</h1>
      <ul>{results.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  // context.query 包含 URL 中所有的查询参数
  // 访问 /search?keyword=nextjs&page=2 时：
  // context.query = { keyword: 'nextjs', page: '2' }
  const { keyword = '', page = '1' } = context.query;

  const res = await fetch(
    `https://api.example.com/search?q=${keyword}&page=${page}`
  );
  const results = await res.json();

  return {
    props: {
      results,
      keyword: String(keyword),
      page: Number(page),
    },
  };
};
```

---

### 场景 2：读取 `context.req` — 鉴权 / Cookie

```tsx
// pages/dashboard.tsx
// 场景：需要登录才能访问的页面，从 Cookie 中读取 token 验证身份

import type { GetServerSideProps } from 'next';

export default function Dashboard({ user }: { user: { name: string } }) {
  return <h1>欢迎，{user.name}</h1>;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;

  // 从请求头中读取 Cookie
  const token = req.cookies['auth-token'];

  if (!token) {
    // 未登录，重定向到登录页
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // 用 token 向后端验证并获取用户信息
  const user = await verifyTokenAndGetUser(token);

  if (!user) {
    return { notFound: true };
  }

  return { props: { user } };
};
```

---

### 场景 3：读取 `context.params` — 动态路由详情（实时数据）

```tsx
// pages/products/[slug].tsx
// 场景：商品详情页，价格库存实时变化，不能用静态生成

import type { GetServerSideProps } from 'next';

type Product = { slug: string; name: string; price: number; stock: number };

export default function ProductDetail({ product }: { product: Product }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>价格：¥{product.price}</p>
      <p>库存：{product.stock}</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // URL /products/iphone-15 时：
  // context.params = { slug: 'iphone-15' }
  const { slug } = context.params!;

  const res = await fetch(`https://api.example.com/products/${slug}`);

  if (!res.ok) {
    return { notFound: true };
  }

  const product: Product = await res.json();

  return { props: { product } };
};
```

---

### 场景 4：设置响应头（`context.res`）

```tsx
// pages/cached-page.tsx
// 场景：通过 res.setHeader 控制 CDN 缓存行为

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // 告诉 CDN 缓存 10 秒，但允许过期内容继续提供服务（stale-while-revalidate）
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');

  const data = await fetchData();
  return { props: { data } };
};
```

---

## 三、`getStaticPaths`

### 函数签名

```ts
export async function getStaticPaths(): Promise<GetStaticPathsResult> {
  return {
    paths: [
      { params: { id: '1' } },
      { params: { id: '2' } },
    ],
    fallback: false | true | 'blocking',
  };
}
```

### `paths` 字段说明

`paths` 是一个数组，每个元素都是 `{ params: { [key]: string } }` 的形式，其中 `key` 对应文件名中的动态段。

| 文件名 | params 结构 |
|--------|------------|
| `pages/blog/[id].tsx` | `{ params: { id: '1' } }` |
| `pages/[category]/[slug].tsx` | `{ params: { category: 'tech', slug: 'nextjs' } }` |
| `pages/docs/[...slug].tsx`（catch-all） | `{ params: { slug: ['a', 'b', 'c'] } }` |

### `fallback` 三种值的区别

| 值 | 行为 | 适用场景 |
|----|------|---------|
| `false` | 未预生成的路径直接返回 404 | 路径数量固定且少 |
| `true` | 先显示 fallback UI，后台生成页面，完成后切换 | 路径非常多，懒加载生成 |
| `'blocking'` | 等待页面生成完成再返回（无 fallback UI） | 不想展示骨架屏，SEO 友好 |

---

### 场景 1：路径数量少 — 全部预生成

```tsx
// pages/blog/[id].tsx
// 场景：只有几篇固定文章，全部在构建时生成

import type { GetStaticPaths, GetStaticProps } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  // 从 API 获取所有文章 ID
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  const posts = await res.json();

  // 将每个 id 映射为 { params: { id: string } }
  // 注意：params 的值必须是字符串
  const paths = posts.map((post: { id: number }) => ({
    params: { id: String(post.id) },
  }));

  return {
    paths, // 构建时生成所有页面
    fallback: false, // 未在 paths 中的路径 → 404
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  // getStaticPaths 生成的 params 会在这里被 context.params 接收
  const { id } = context.params!;
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  const post = await res.json();
  return { props: { post } };
};

export default function BlogDetail({ post }: any) {
  return <h1>{post.title}</h1>;
}
```

---

### 场景 2：路径数量多 — `fallback: 'blocking'`

```tsx
// pages/products/[slug].tsx
// 场景：电商平台有几十万商品，不可能全部预生成
// 先生成热门商品，其余的访问时按需生成

export const getStaticPaths: GetStaticPaths = async () => {
  // 只预生成销量最好的 100 个商品
  const res = await fetch('https://api.example.com/products/top100');
  const products = await res.json();

  const paths = products.map((p: { slug: string }) => ({
    params: { slug: p.slug },
  }));

  return {
    paths,
    fallback: 'blocking',
    // 其余商品路径：访问时在服务端生成，生成完再返回给用户（不闪烁）
  };
};
```

---

### 场景 3：多级动态路由

```tsx
// pages/docs/[category]/[slug].tsx
// 场景：文档站，URL 形如 /docs/react/hooks

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await fetchAllDocs();

  // params 需要同时提供 category 和 slug 两个字段
  const paths = docs.map((doc: { category: string; slug: string }) => ({
    params: {
      category: doc.category, // 对应 [category]
      slug: doc.slug,         // 对应 [slug]
    },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async (context) => {
  // context.params = { category: 'react', slug: 'hooks' }
  const { category, slug } = context.params!;
  const doc = await fetchDoc(String(category), String(slug));
  return { props: { doc } };
};
```

---

### 场景 4：`fallback: true` — 展示骨架屏

```tsx
// pages/news/[id].tsx
// 场景：新闻页，路径很多，未预生成时先展示 loading 骨架屏

import { useRouter } from 'next/router';

export default function NewsDetail({ article }: any) {
  const router = useRouter();

  // fallback: true 时，路由还未生成完毕，isFallback 为 true
  if (router.isFallback) {
    return <div>加载中...</div>; // 骨架屏 / loading 状态
  }

  return <article><h1>{article.title}</h1></article>;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],       // 构建时不预生成任何路径
    fallback: true,  // 全部按需生成，先展示骨架屏
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { id } = context.params!;
  const article = await fetchArticle(String(id));
  if (!article) return { notFound: true };
  return { props: { article }, revalidate: 60 };
};
```

---

## 四、三者协作完整示例

```
场景：电商商品详情页
- 热门商品构建时预生成（getStaticPaths + getStaticProps）
- 价格 / 库存每 30 秒 ISR 更新（revalidate）
- 不存在的商品返回 404
```

```tsx
// pages/shop/[productId].tsx

import type { GetStaticPaths, GetStaticProps } from 'next';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
};

export default function ProductPage({ product }: { product: Product }) {
  return (
    <main>
      <h1>{product.name}</h1>
      <p>¥{product.price}</p>
      <p>库存：{product.stock}</p>
      <p>{product.description}</p>
    </main>
  );
}

// Step 1：告诉 Next.js 构建时要预生成哪些路径
export const getStaticPaths: GetStaticPaths = async () => {
  const res = await fetch('https://api.example.com/products/hot');
  const hotProducts: Product[] = await res.json();

  const paths = hotProducts.map((p) => ({
    params: { productId: p.id }, // 对应文件名 [productId]
  }));

  return {
    paths,
    fallback: 'blocking', // 非热门商品访问时按需生成，无骨架屏
  };
};

// Step 2：根据 params.productId 获取具体商品数据
export const getStaticProps: GetStaticProps<{ product: Product }> = async (context) => {
  // context.params 由 getStaticPaths 的 paths 提供
  // 或者用户访问未预生成的路径时，由 Next.js 运行时自动传入
  const { productId } = context.params!;

  const res = await fetch(`https://api.example.com/products/${productId}`);

  if (!res.ok) {
    return { notFound: true }; // 商品不存在 → 404
  }

  const product: Product = await res.json();

  return {
    props: { product },
    revalidate: 30, // 每 30 秒重新生成，价格库存保持相对新鲜
  };
};
```

---

## 五、快速记忆口诀

```
getStaticProps   → 构建时拿数据，context.params 来自 getStaticPaths
getServerSideProps → 请求时拿数据，context.req/res/query 包含请求信息
getStaticPaths   → 告诉构建器要生成哪些路径，fallback 控制未命中行为

params    → 动态路由参数（文件名里的 [id]）
query     → URL 查询字符串（?page=1&sort=desc）仅 getServerSideProps 有
req/res   → 原生请求响应对象，仅 getServerSideProps 有
```
