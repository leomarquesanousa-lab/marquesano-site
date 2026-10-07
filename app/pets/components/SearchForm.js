import Icon from './Icon';
import BrazilianDateInput from './BrazilianDateInput';
import {states} from '../lib/constants.mjs';
export default function SearchForm({filters={},categories=[],compact=false,action='/pets/buscar',locked=[]}) {
 return <form action={action} method="get" className={compact?'hero-search':'filter-form'} role="search">
 {compact?<><label><Icon name="pin" size={19}/><span className="sr-only">Cidade</span><input name="city" placeholder="Em qual cidade você está?" defaultValue={filters.city}/></label><label className="search-type"><span className="sr-only">Situação</span><select name="situation" defaultValue={filters.situation||''}><option value="">Todos os pets</option><option value="perdido">Perdidos</option><option value="encontrado">Encontrados</option><option value="adocao">Para adoção</option></select></label><button className="button"><Icon name="search" size={19}/> Buscar pets</button></>:<>
 <label className="filter-query">O que você procura?<input name="q" placeholder="Nome ou característica do pet" defaultValue={filters.q}/></label>
 <label>Situação<select name="situation" disabled={locked.includes('situation')} defaultValue={filters.situation||''}><option value="">Todas as situações</option><option value="perdido">Perdido</option><option value="encontrado">Encontrado</option><option value="adocao">Para adoção</option></select></label>
 <label>Animal<select name="category" disabled={locked.includes('category')} defaultValue={filters.category||''}><option value="">Todos os animais</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
 <label>Cidade<input name="city" readOnly={locked.includes('city')} placeholder="Sua cidade" defaultValue={filters.city}/></label>
 <label>Estado<select name="state" disabled={locked.includes('state')} defaultValue={filters.state||''}><option value="">Todos</option>{states.map(s=><option key={s}>{s}</option>)}</select></label>
 <label>Bairro<input name="neighborhood" placeholder="Qualquer bairro" defaultValue={filters.neighborhood}/></label>
 <label>A partir de (DD/MM/YYYY)<BrazilianDateInput name="date" defaultValue={filters.date}/></label>
 <label>Sexo<select name="sex" defaultValue={filters.sex||''}><option value="">Todos</option><option value="macho">Macho</option><option value="femea">Fêmea</option><option value="desconhecido">Não informado</option></select></label>
 <label>Porte<select name="size" defaultValue={filters.size||''}><option value="">Todos</option><option value="pequeno">Pequeno</option><option value="medio">Médio</option><option value="grande">Grande</option><option value="desconhecido">Não informado</option></select></label>
 <div className="filter-buttons"><button className="button"><Icon name="search" size={18}/> Buscar</button><a href={action} className="text-link">Limpar filtros</a></div>
 </>}
 </form>;
}
