import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./designer-backstage.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Designer Backstage | Bespoke Furniture",
  description:
    "Curated furniture for discerning clients. Handcrafted pieces that define modern luxury.",
};

export default function DesignerBackstageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${playfair.variable} ${sourceSans.variable} db-theme`}>
      <header className="db-header">
        <div className="db-header-inner">
          <Link href="/designer-backstage" className="db-logo">
            Designer Backstage
          </Link>
          <nav className="db-nav">
            <Link href="/designer-backstage">Collection</Link>
            <Link href="/designer-backstage/about">About</Link>
          </nav>
        </div>
      </header>
      <main className="db-main">{children}</main>
      <footer className="db-footer">
        <div className="db-footer-inner">
          <span className="db-footer-brand">Designer Backstage</span>
          <span className="db-footer-copy">
            Handcrafted with intention. © {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}
