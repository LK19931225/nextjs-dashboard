import { Metadata } from "next";

// 为某个特定页面添加自定义标题，会覆盖父页面的元数据
export const metadata: Metadata = {
  title: 'Customers',
};
export default function Page() {
  return <p>Customers Page</p>;
}
