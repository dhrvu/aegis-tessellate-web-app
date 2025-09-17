import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "Aegis",
    template: "%s · Aegis",
  },
  description:
    "Aegis — fast, deterministic text transformer and plagiarism remover. Paste text or upload a PDF to get an originality-optimized rewrite.",
  keywords: [
    "Aegis",
    "plagiarism remover",
    "plagiarism rewriter", 
    "plagiarism checker bypass",
    "AI detection evasion",
    "Turnitin alternative",
    "GPTZero bypass",
    "Plaigrasim remover",
    "text rewriter",
    "originality improver",
  ],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Aegis",
    description:
      "Aegis transforms your text to reduce plagiarism and AI detection confidence using a deterministic multi‑agent pipeline.",
    url: "https://example.com/", // replace at deploy
    siteName: "Aegis",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Aegis — plagiarism remover & originality enhancer",
    description:
      "Deterministic, multi‑agent text transformation. Paste or upload, get cleaner, more original output.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {children}
        <VisualEditsMessenger />
      </body>
    </html>
  );
}