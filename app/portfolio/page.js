import { pageMetadata } from "../config/metadata";
import Commercial from "../components/Commercial";
export const metadata = pageMetadata("/portfolio", "Portfólio | Marquesano", "Explore exemplos de sites profissionais criados pela Marquesano para diferentes negócios.");
export default function Page() { return <Commercial page="portfolio"/>; }
