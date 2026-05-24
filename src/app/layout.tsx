import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { MobileTabBar } from "@/components/MobileTabBar";

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowboard",
  description: "Flexible task management for neurodivergent minds",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settingsRow] = await db.select({ density: settings.density }).from(settings).limit(1);
  const density = settingsRow?.density ?? 'default';

  return (
    <html lang="en" className={newsreader.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function a(e){document.documentElement.setAttribute('data-theme',e.matches?'dark':'light');}a(m);m.addEventListener('change',a);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full" data-density={density}>
        {children}
        <MobileTabBar />
      </body>
    </html>
  );
}
