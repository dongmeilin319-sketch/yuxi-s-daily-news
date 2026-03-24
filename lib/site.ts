/**
 * canonical 站点根 URL（无末尾 `/`）。
 * 优先级：NEXT_PUBLIC_SITE_URL > VERCEL_URL（Vercel 自动注入）> 本地默认。
 * 生产环境强烈建议设置 NEXT_PUBLIC_SITE_URL 为最终域名（含 https），
 * 以便 sitemap、RSS、OG 与 canonical 与自定义域名一致。
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}
