import type { Metadata } from "next";
import NavbarContainer from "./components/NavbarContainer";
import { Inter, Noto_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ứng dụng quản lý kho",
  description: "Ứng dụng quản lý kho nội bộ công ty",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${notoSans.variable} font-sans antialiased`}
      >
        <NavbarContainer />
        <main className="mx-auto max-w-6xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
