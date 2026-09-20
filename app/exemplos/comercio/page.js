import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Commerce from "../../components/Commerce";
export const metadata = pageMetadata("/exemplos/comercio", "Bosque Store | Portfólio Marquesano", "Bosque Store: exemplo demonstrativo de loja no portfólio da Marquesano.");
function Page() { return <Commerce/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/comercio" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
