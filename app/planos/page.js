export const dynamic="force-dynamic";
import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/planos", "Planos de site por assinatura | Marquesano", "Compare planos de criação de site por assinatura com hospedagem e suporte. Confira preços, domínio, escopo e quantidade de cobranças antes de contratar.");
function Page() { return <Commercial page="planos"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/planos" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
