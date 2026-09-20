import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/portfolio", "Portfólio | Marquesano", "Explore exemplos de sites profissionais criados pela Marquesano para diferentes negócios.");
function Page() { return <Commercial page="portfolio"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/portfolio" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
