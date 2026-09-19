import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/contato", "Contato | Marquesano", "Converse com a Marquesano sobre o site da sua empresa. Conte sua ideia e solicite uma proposta.");
export default function Page() { return <Commercial page="contato"/>; }
