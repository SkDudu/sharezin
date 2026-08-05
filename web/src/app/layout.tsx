import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Syne } from "next/font/google";

import { AppNav } from "@/components/app-nav";
import { Providers } from "@/components/providers";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sharezin - Divisão de Recibos",
  description: "Divida contas de restaurantes, bares e eventos em grupo.",
};

// ponytail: mobile-first; allow pinch if OS wants it
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${dmSans.variable} ${syne.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sharezin-theme");if(t==="light")document.documentElement.classList.remove("dark");else document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <main className="flex min-h-0 flex-1 flex-col md:pl-60">
            {children}
          </main>
          <AppNav />
        </Providers>
      </body>
    </html>
  );
}
