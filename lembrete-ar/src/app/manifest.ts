import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lembrete de retorno",
    short_name: "Lembrete",
    start_url: "/app",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#0052CC",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
