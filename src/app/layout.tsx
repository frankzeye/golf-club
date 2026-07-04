import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { SessionProvider } from "@/components/SessionProvider";
import { Footer } from "@/components/Footer";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Spencer's Crossing Golf Club",
    default: "Spencer's Crossing Golf Club",
  },
  description: "Your golf club social platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <SessionProvider session={session}>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
