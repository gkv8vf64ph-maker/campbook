import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CampBook",
    short_name: "CampBook",
    description: "思い出を、しおりに。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#384334",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}