import Link from 'next/link';
import Icon from './components/Icon';
export default function NotFound(){return <div className="container error-page"><Icon name="search" size={50}/><h1>Não encontramos esse caminho.</h1><p>O anúncio pode ter sido ocultado ou excluído. Vamos procurar outros pets na sua região?</p><Link className="button" href="/pets/buscar">Buscar pets</Link></div>;}
