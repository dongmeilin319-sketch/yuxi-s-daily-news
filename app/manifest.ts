import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dlim's Wonderland",
    short_name: "Wonderland",
    description: "AI 行业新闻聚合与结构化洞察平台",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#111827",
    lang: "zh-CN",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
