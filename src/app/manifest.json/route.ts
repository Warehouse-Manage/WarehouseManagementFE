import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: "Ứng dụng quản lý kho",
    short_name: "Quản lý kho",
    description: "Ứng dụng quản lý kho nội bộ công ty",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ea4c00",
    theme_color: "#ea4c00",
    orientation: "portrait-primary",
    lang: "vi-VN",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon512_maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon512_rounded.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
