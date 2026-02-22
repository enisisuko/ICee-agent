/* 静态资源模块声明 — 允许 import logoUrl from "*.png" 等 */
declare module "*.png" {
  const url: string;
  export default url;
}
declare module "*.svg" {
  const url: string;
  export default url;
}
declare module "*.jpg" {
  const url: string;
  export default url;
}
declare module "*.webp" {
  const url: string;
  export default url;
}
