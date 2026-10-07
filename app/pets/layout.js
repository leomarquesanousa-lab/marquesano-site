import './portal.css';
import {Header,Footer} from './components/Shell';
import {siteDescription} from './lib/seo.mjs';
export const metadata={title:{default:'Pet Find | Marquesano',template:'%s | Pet Find'},description:siteDescription};
export default function PetsLayout({children}){return <div className="pets-portal"><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;550;600;650;700&amp;family=Manrope:wght@400;500;600;650;700;750;800&amp;display=swap" precedence="pets-fonts"/><Header/><main id="conteudo-pets">{children}</main><Footer/></div>;}
