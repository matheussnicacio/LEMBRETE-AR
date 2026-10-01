import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lembrete de retorno",
    short_name: "Lembrete",
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f8fa",
    theme_color: "#0a7ea4",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
