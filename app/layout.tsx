import type { Metadata } from "next";
import "./globals.css";
import { AuthSiteGate } from "@/components/auth-site-gate";
import { getSessionUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SitePageBackdrop } from "@/components/site-page-backdrop";

const themeInlineScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else if(t==="light")document.documentElement.classList.remove("dark");else if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Dlim's Wonderland",
  description: "AI 行业新闻聚合与结构化洞察平台",
  metadataBase: new URL(getSiteUrl()),
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionUser = await getSessionUser();

  return (
    <html lang="zh-CN" className="h-full min-h-screen antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInlineScript }} />
      </head>
      <body className="min-h-screen bg-white font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
        <div className="relative isolate flex min-h-screen flex-col">
          <SitePageBackdrop />
          <SiteHeader />
          <div className="relative flex min-h-0 min-h-screen flex-1 flex-col">
            {sessionUser ? children : <AuthSiteGate />}
          </div>
        </div>
      </body>
    </html>
  );
}
