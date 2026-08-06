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
  applicationName: "Sharezin",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sharezin",
    statusBarStyle: "black-translucent",
    // ponytail: portrait splash only; Android builds splash from manifest bg+icon
    startupImage: [
      {
        url: "/splash/iphone-x.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-14-pro.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-12-pro-max.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/iphone-15-pro.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/android-generic.png",
        media: "(device-width: 360px) and (device-height: 640px)",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// ponytail: mobile-first; allow pinch if OS wants it
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0D" },
    { media: "(prefers-color-scheme: light)", color: "#F5C518" },
  ],
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
