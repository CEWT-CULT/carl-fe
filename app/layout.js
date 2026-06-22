import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./Providers";
import NavBar from "@/components/NavBar";
import "./globals.css";
import { META } from "@/config";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: META.title,
  description: META.description,
  metadataBase: new URL(META.url),
  openGraph: {
    title: META.title,
    description: META.description,
    url: META.url,
    siteName: META.title,
    image: META.logo,
    cardImage: META.logo,
    images: [META.logo],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: META.title,
    description: META.description,
    image: META.logo,
    cardImage: META.logo,
    images: [META.logo],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="icon" href="/icons/logo.webp" type="image/webp" />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 min-h-screen flex flex-col`}>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
