import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/contato", "Contato | Marquesano", "Converse com a Marquesano sobre o site da sua empresa. Conte sua ideia e solicite uma proposta.");
function Page() { return <Commercial page="contato"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/contato" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
