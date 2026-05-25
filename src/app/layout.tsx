import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { MobileTabBar } from "@/components/MobileTabBar";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
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
    <html lang="en" className={newsreader.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('fb-theme');var m=window.matchMedia('(prefers-color-scheme: dark)');function a(d){document.documentElement.setAttribute('data-theme',d?'dark':'light');}if(s==='dark'||s==='light'){a(s==='dark');}else{a(m.matches);m.addEventListener('change',function(e){if(!localStorage.getItem('fb-theme'))a(e.matches);});}}catch(e){}})()`,
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
