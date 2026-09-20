import StructuredData from "../../../components/StructuredData";
import { pageMetadata } from "../../../config/metadata";
import Restaurant from "../../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante/menu", "Menu | Casa Sapore", "Explore o cardápio demonstrativo da Casa Sapore, um projeto do portfólio Marquesano.");
function Page() { return <Restaurant menuPage/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/restaurante/menu" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
