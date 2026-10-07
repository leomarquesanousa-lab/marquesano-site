import StructuredData from "../../components/StructuredData";
import { pageMetadata } from "../../config/metadata";
import Barber from "../../components/Barber";
export const metadata = pageMetadata("/exemplos/barbearia", "Site para barbearia: exemplo de design | Marquesano", "Navegue pelo site demonstrativo Black House, com serviços e agendamento para barbearia. Veja possibilidades para seu negócio e os planos Marquesano.");
function Page() { return <Barber/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/exemplos/barbearia" title={metadata.title} description={metadata.description} service={false}/><Page {...props}/></>; }
