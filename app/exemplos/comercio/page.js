import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Commerce from "../../components/Commerce";
export const metadata = pageMetadata("/exemplos/comercio", "Criação de site para comércio: exemplo | Marquesano", "Explore Bosque Store, uma vitrine demonstrativa para comércio com catálogo de produtos. Veja possibilidades para seu site profissional com a Marquesano.");
function Page() { return <Commerce/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/comercio" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
