This is a starter template with pages-router for [Learn Next.js](https://nextjs.org/learn).
# 1.pages router
这个项目是pages router模式，next13之后默认是app router模式
pages router:文件路由
app router:文件夹路由


# 2.代码拆分与预取
在 Next.js 的生产版本中，每当Link组件出现在浏览器视口时，Next.js 会自动预取链接页面的后台代码。当你点击链接时，目标页面的代码已经在后台加载，页面切换几乎是瞬间完成的！

# 3.nextjs做的优化
代码拆分、客户端导航和预取（生产环境中）,使得访问更快更流畅

# 4.SSG与SSR的区别
Next.js有两种预渲染形式：**静态生成**和**服务器端渲染**。区别在于它为页面生成HTML的**时间**。

- **静态生成**是一种预渲染方法，它在**构建时**生成HTML。预渲染的HTML然后在每次请求时被**重用**。

- **服务器端渲染**是一种预渲染方法，它在**每次请求**时生成HTML。

重要的是，Next.js允许你为每个页面**选择**使用哪种预渲染形式

“我能在用户请求之前预渲染这个页面吗？”如果答案是肯定的，那么你应该选择静态生成 。

# 5.带数据的静态生成
getStaticProps在构建时运行,适配带数据的SSG， 只在服务器端运行，不会在浏览器运行
```tsx
export default function Home(props) { ... }
 
export async function getStaticProps() {
  // Get external data from the file system, API, DB, etc.
  const data = ...
 
  // The value of the `props` key will be
  //  passed to the `Home` component
  return {
    props: ...
  }
}
```
注意 ：在开发模式下，getStaticProps 会对每个请求运行。在生产时会重复使用
getStaticProps只能在page页面导出,其结果可被CDN缓存

# 6.服务端SSR渲染
getServerSideProps,从页面导出,在请求时被调用,其参数（ 上下文 ）包含请求特定的参数

```tsx
export async function getServerSideProps(context) {
  return {
    props: {
      // props for your component
    },
  };
}
```

# 7.调用接口
nextjs默认支持fetch

# 8.动态路由
使用 getStaticPath 静态生成带有动态路由的页面
编写 getStaticProps 来获取每篇博客文章的数据

# 9.pages vs app路由：默认行为及如何指定
1.Pages Router 主要通过导出的特定函数来指定渲染方式：
方式	指定方法
服务端渲染（SSR）	导出 getServerSideProps
静态生成（SSG）	默认行为，或导出 getStaticProps
客户端渲染（CSR）	不导出任何数据获取函数，直接在组件内使用 useEffect 等客户端方法获取数据

2.App Router：默认是服务端组件
方式	指定方法
服务端组件	默认行为，无需额外声明
客户端组件	在文件顶部添加 'use client' 指令

# 10. api路由
pages/api: API 目录
```tsx
// req = HTTP incoming message, res = HTTP server response
export default function handler(req, res) {
  // ...
}
```