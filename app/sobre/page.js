import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/sobre", "Sobre a Marquesano: sites para pequenas empresas", "Conheça a Marquesano e sua proposta de criação de sites profissionais por assinatura para pequenas empresas, com design e acompanhamento contínuo.");
function Page() { return <Commercial page="sobre"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/sobre" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
