export const dynamic="force-dynamic";
import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/planos", "Planos | Marquesano", "Conheça os planos de sites da Marquesano mensais, com criação, hospedagem e suporte.");
function Page() { return <Commercial page="planos"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/planos" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
