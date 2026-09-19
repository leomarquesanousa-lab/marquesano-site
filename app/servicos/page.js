import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/servicos", "Serviços | Marquesano", "Conheça os serviços de design, criação de sites e acompanhamento da Marquesano para sua empresa.");
export default function Page() { return <Commercial page="servicos"/>; }
