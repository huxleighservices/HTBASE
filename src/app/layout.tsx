
import type { Metadata } from "next";
import { Space_Grotesk, Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});


export const metadata: Metadata = {
  title: "HTBase — AI-First ERP",
  description: "AI-First ERP for any business. Powered by HTBase.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/HTBASEICON.png', sizes: '750x750' },
    ],
    shortcut: '/favicon.ico',
    apple: '/HTBASEICON.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Montserrat:wght@400;700&family=Inter:wght@400;700&family=Georgia&family=Times+New+Roman&family=Arial&display=swap" rel="stylesheet" />
      </head>
      <body className={`font-body antialiased ${spaceGrotesk.variable} ${montserrat.variable} ${inter.variable}`}>
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
