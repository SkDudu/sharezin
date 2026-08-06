import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sharezin",
    short_name: "Sharezin",
    description: "Divida contas de restaurantes, bares e eventos em grupo.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0C0C0D",
    theme_color: "#F5C518",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
