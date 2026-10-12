import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ibl.ai/sis",
    short_name: "ibl.ai SIS",
    description: "The open-source student information system for schools on the ibl.ai platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0058cc",
    icons: [
      { src: "/icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/icon-1024.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
