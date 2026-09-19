import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/planos", "Planos | Marquesano", "Conheça os planos de sites da Marquesano a partir de R$ 99 por mês, com criação, hospedagem e suporte.");
export default function Page() { return <Commercial page="planos"/>; }
