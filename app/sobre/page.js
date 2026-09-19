import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/sobre", "Sobre | Marquesano", "Conheça a Marquesano e nossa proposta de sites profissionais com design, tecnologia e acompanhamento.");
export default function Page() { return <Commercial page="sobre"/>; }
