import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/servicos", "Serviços | Marquesano", "Conheça os serviços de design, criação de sites e acompanhamento da Marquesano para sua empresa.");
function Page() { return <Commercial page="servicos"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/servicos" title={metadata.title} description={metadata.description} service={true}/><Page {...props}/></>; }
