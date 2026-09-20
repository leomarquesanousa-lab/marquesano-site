import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Restaurant from "../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante", "Casa Sapore | Portfólio Marquesano", "Casa Sapore: exemplo demonstrativo de site para restaurante no portfólio da Marquesano.");
function Page() { return <Restaurant/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/restaurante" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
