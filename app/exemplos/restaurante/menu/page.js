import { pageMetadata } from "../../../config/metadata";
import Restaurant from "../../../components/Restaurant";
export const metadata = pageMetadata("/exemplos/restaurante/menu", "Menu | Casa Sapore", "Explore o cardápio demonstrativo da Casa Sapore, um projeto do portfólio Marquesano.");
export default function Page() { return <Restaurant menuPage/>; }
