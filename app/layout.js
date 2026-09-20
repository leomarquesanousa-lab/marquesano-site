import "./globals.css";
import "./refined.css";
import "./production.css";
import "./motion.css";
import Script from "next/script";
import SiteMotion from "./components/SiteMotion";
import PublicTracking from "./components/PublicTracking";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import { siteIcons } from "./config/icons";
import {
  siteUrl,
  siteTitle,
  siteDescription,
  socialDescription,
  socialImage,
} from "./config/metadata";

export const metadata = {
  metadataBase: new URL(siteUrl),
  icons: siteIcons,
  title: siteTitle,
  description: siteDescription,
  applicationName: "Marquesano",
  creator: "Marquesano",
  publisher: "Marquesano",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Marquesano",
    title: siteTitle,
    description: socialDescription,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: socialDescription,
    images: [socialImage],
  },
};

export const viewport = {
  themeColor: "#0a1320",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}

        <SiteMotion />
        <FloatingWhatsApp />
        <PublicTracking />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X9918PE2F3"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-X9918PE2F3');
          `}
        </Script>
      </body>
    </html>
  );
}