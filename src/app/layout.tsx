import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter", 
  display: "swap" 
});

export const metadata: Metadata = {
  title: {
    default: "Aegis - Secure Text Processing Framework",
    template: "%s | Aegis",
  },
  description: "Process text through the Aegis-Tessellate framework for evasion optimization. Upload PDFs or paste text securely.",
  keywords: ["text processing", "AI evasion", "secure upload", "PDF extraction"],
  authors: [{ name: "Aegis Team" }],
  creator: "Aegis",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  openGraph: {
    title: "Aegis",
    description: "Secure, multi-agent text processing with evasion optimization.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://aegis.example.com",
    siteName: "Aegis",
    images: [
      {
        url: "https://aegis.example.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aegis - Text Processing Framework",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis",
    description: "Deterministic text refinement and evasion optimization.",
    images: ["https://aegis.example.com/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://aegis.example.com",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}