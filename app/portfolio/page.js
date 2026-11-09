import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/portfolio", "Portfólio de projetos reais | Marquesano", "Conheça os sites Hortoleve, UPOST e Rádio TV Web, desenvolvidos pela Marquesano. Veja capturas reais e visite os projetos publicados.");
function Page() { return <Commercial page="portfolio"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/portfolio" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
