import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Big Little Reveal",
  description: "Cast your guess and join us for the big little moment.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
