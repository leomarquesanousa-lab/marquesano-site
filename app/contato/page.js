import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const dynamic="force-dynamic";
export const metadata = pageMetadata("/contato", "Contato para criação de site profissional | Marquesano", "Fale com a Marquesano sobre a criação do site da sua empresa. Tire dúvidas sobre planos por assinatura, escopo, domínio, hospedagem e suporte.");
function Page() { return <Commercial page="contato"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/contato" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
