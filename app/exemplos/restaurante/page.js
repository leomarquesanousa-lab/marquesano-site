import { pageMetadata } from "../../config/metadata";
import Restaurant from "../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante", "Casa Sapore | Portfólio Marquesano", "Casa Sapore: exemplo demonstrativo de site para restaurante no portfólio da Marquesano.");
export default function Page() { return <Restaurant/>; }
