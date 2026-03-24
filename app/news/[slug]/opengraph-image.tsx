import { ImageResponse } from "next/og";
import { getNewsBySlug } from "@/lib/content";

export const alt = "AI Intelligence Hub";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const item = getNewsBySlug(slug);

  const title = item?.title ?? "AI Intelligence Hub";
  const summary = item?.summary ?? "AI 行业新闻聚合与结构化洞察";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #111827 0%, #1f2937 50%, #0f172a 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.9 }}>AI Intelligence Hub</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 28, lineHeight: 1.4, opacity: 0.9 }}>{summary}</div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75 }}>news intelligence • ai industry</div>
      </div>
    ),
    {
      ...size,
    },
  );
}
