import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Barber from "../../components/Barber";
export const metadata = pageMetadata("/exemplos/barbearia", "Black House | Portfólio Marquesano", "Black House: exemplo demonstrativo de site para barbearia no portfólio da Marquesano.");
function Page() { return <Barber/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/barbearia" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
