import type { Metadata } from "next";
import localFont from "next/font/local";
import ToastProvider from "@/components/ui/ToastProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Generic root metadata — per-chapter branding is applied client-side from the
// resolved tenant, so the static title stays chapter-neutral.
export const metadata: Metadata = {
  title: "BNI Visitor Manager",
  description: "Visitor management dashboard for BNI chapters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
