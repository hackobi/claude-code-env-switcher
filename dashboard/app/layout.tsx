import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Engine",
  description: "Your clients, content and creative work in one place",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
