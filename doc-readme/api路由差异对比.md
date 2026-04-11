# Next.js：Pages Router 与 App Router 中的 API 端点

本文对比 **Pages Router**（`pages/api`）与 **App Router**（`app/**/route.ts`）在 API 端点上的差异与使用方式。

---

## Pages Router：`pages/api/*`

### 位置与约定

- 文件放在 `pages/api/` 下，例如 `pages/api/hello.ts` → 路径 **`/api/hello`**。
- 导出**默认函数**，签名为 Node 风格的请求处理器。

### 形态

- 本质是 **一个 API Route 函数**，接收 `NextApiRequest`、`NextApiResponse`（或 Edge 时使用 `NextRequest` 等，取决于配置）。
- 与 `pages/` 里页面同一套构建与部署模型，偏「在 Node 里手写 req/res」。

### 示例

```ts
// pages/api/hello.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }
  res.status(200).json({ message: 'ok' });
}
```

### 要点

- **动态段**：`pages/api/user/[id].ts` → `/api/user/:id`。
- 可配置 **Edge Runtime**（例如在文件中 `export const config = { runtime: 'edge' }` 等，具体以当前 Next 版本文档为准）。
- 与 **React 页面路由** 并列，都在 `pages/` 树下，心智模型是「页面 + 独立 API 文件」。

---

## App Router：`app/**/route.ts`（Route Handlers）

### 位置与约定

- 在任意 `app` 段目录下放 **`route.ts`（或 `route.js`）**，该段的路径就是 URL；**没有**固定的 `api` 前缀，除非你建 `app/api/...`。
- 例如：
  - `app/api/hello/route.ts` → **`/api/hello`**（与旧习惯对齐）
  - `app/seed/route.ts` → **`/seed`**（本仓库教程式示例常见写法）

### 形态

- 导出 **具名函数**：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS` 等，对应 HTTP 方法。
- 使用 Web 标准 **`Request` / `Response`**（或 `NextResponse`），与 **Fetch、`Response.json()`** 一致。

### 示例

```ts
// app/api/hello/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'ok' });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ received: body }, { status: 201 });
}
```

### 要点

- 同一目录下 **`page.tsx` 与 `route.ts` 互斥**：有 `page` 就没有该路径的纯 API；API 通常放在专门段（如 `app/api/...`）或独立路径段（如 `app/seed/route.ts`）。
- **动态路由**：`app/api/user/[id]/route.ts` → `/api/user/:id`，在处理器里通过 `params` 读取（Next 15+ 中 `params` 可能为 Promise，以官方文档为准）。
- **Route Segment Config**：`export const dynamic = 'force-static'`、`revalidate`、`runtime` 等，作用在**该路由段**。
- **Server Actions** 是另一种服务端逻辑写法，不是 HTTP 路径，与 Route Handlers 互补。

---

## 核心差异对照

| 维度 | Pages Router `pages/api` | App Router `route.ts` |
|------|--------------------------|------------------------|
| 文件位置 | `pages/api/...` | `app/.../route.ts`（路径由文件夹决定） |
| 导出 | `default function handler` | `GET` / `POST` / … 具名导出 |
| 请求/响应 | `NextApiRequest` / `NextApiResponse` | `Request` / `Response`（常配合 `NextResponse`） |
| URL | 固定挂在 `/api/*` | 任意段，常用 `app/api/*` 模拟旧习惯 |
| 与页面关系 | 与 `pages/*.tsx` 并列 | 与同段 `page.tsx` 二选一（同一路径不能既要页面又要 route） |
| 风格 | 偏 Node req/res | 偏 Web Fetch / Response，流式等更自然 |

---

## 使用建议

- **新项目仅用 App Router**：新 API 优先用 **`app/.../route.ts`**；对外 REST 风格接口可统一放在 **`app/api/.../route.ts`**。
- **老项目仍为 Pages**：可继续使用 **`pages/api`**；迁移时可逐步迁到 App 的 Route Handlers（Next 支持 **App 与 Pages 共存**一段时间）。
- **表单与数据变更**：App Router 中除 Route Handler 外，还可使用 **Server Actions**，不必每个操作都对应一个 URL。

---

## 与本仓库的对应关系

本仓库为 **App Router** 结构，示例性 Route Handler 包括：

- `app/seed/route.ts` → **`/seed`**
- `app/query/route.ts` → **`/query`**

若希望与传统「全部挂在 `/api` 下」的命名一致，可将上述文件迁移到 `app/api/seed/route.ts`、`app/api/query/route.ts` 等路径（需同步更新调用这些 URL 的客户端代码）。

---

*文档整理自 Next.js 常见用法说明，具体 API 以 [Next.js 官方文档](https://nextjs.org/docs) 当前版本为准。*
