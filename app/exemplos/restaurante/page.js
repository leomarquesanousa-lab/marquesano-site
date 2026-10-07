import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Restaurant from "../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante", "Criação de site para restaurante: exemplo | Marquesano", "Conheça Casa Sapore, exemplo demonstrativo de site para restaurante com cardápio e reservas. Explore o projeto e os planos de sites por assinatura.");
function Page() { return <Restaurant/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/restaurante" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
