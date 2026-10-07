import StructuredData from "../../../components/StructuredData";
import { pageMetadata } from "../../../config/metadata";
import Restaurant from "../../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante/menu", "Cardápio digital demonstrativo para restaurante | Marquesano", "Explore o cardápio digital fictício da Casa Sapore e veja como apresentar pratos em um site para restaurante. Exemplo do portfólio Marquesano.");
function Page() { return <Restaurant menuPage/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/restaurante/menu" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
