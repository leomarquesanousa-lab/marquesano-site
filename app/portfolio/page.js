import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/portfolio", "Portfólio de sites profissionais por segmento | Marquesano", "Explore sites demonstrativos para clínica, restaurante, barbearia e comércio. Conheça possibilidades de design para o site profissional do seu negócio.");
function Page() { return <Commercial page="portfolio"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/portfolio" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
