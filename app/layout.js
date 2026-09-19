import "./globals.css";
import "./refined.css";
import "./production.css";
import "./motion.css";
import SiteMotion from "./components/SiteMotion";
import FloatingWhatsApp from "./components/FloatingWhatsApp";
import { siteIcons } from "./config/icons";

export const metadata = {
  metadataBase: new URL("https://marquesano.com.br"),
  icons: siteIcons,
  title: "Marquesano | Sites profissionais por assinatura",
  description: "Sites profissionais para pequenos negócios sem taxa de criação. Domínio, hospedagem, manutenção e suporte em uma única mensalidade."
};

export const viewport = { themeColor: "#0a1320" };

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}<SiteMotion/><FloatingWhatsApp/></body></html>;
}
