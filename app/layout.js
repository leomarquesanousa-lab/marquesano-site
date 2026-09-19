import "./globals.css";
import "./refined.css";
import FloatingWhatsApp from "./components/FloatingWhatsApp";

export const metadata = {
  title: "SuaMarca | Sites profissionais por assinatura",
  description: "Sites profissionais para pequenos negócios sem taxa de criação. Domínio, hospedagem, manutenção e suporte em uma única mensalidade."
};

export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}<FloatingWhatsApp/></body></html>;
}
