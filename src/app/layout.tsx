import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpdeck · AI support inbox for online stores",
  description: "Helpdeck drafts replies from your help centre and live order data. Your agents approve every word.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
