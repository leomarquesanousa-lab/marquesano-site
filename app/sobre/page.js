import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/sobre", "Sobre | Marquesano", "Conheça a Marquesano e nossa proposta de sites profissionais com design, tecnologia e acompanhamento.");
function Page() { return <Commercial page="sobre"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/sobre" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
