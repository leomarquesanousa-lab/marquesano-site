import StructuredData from "../components/StructuredData";
import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/servicos", "Criação e manutenção de sites profissionais | Marquesano", "Desenvolvimento de sites para pequenas empresas no Brasil, com design responsivo, hospedagem, manutenção e suporte conforme o plano contratado.");
function Page() { return <Commercial page="servicos"/>; }

export default function PageWithSEO(props) { return <><StructuredData path="/servicos" title={metadata.title} description={metadata.description} service={true}/><Page {...props}/></>; }
