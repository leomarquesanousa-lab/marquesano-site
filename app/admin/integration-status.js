import { Badge } from './visuals.js';

export default function IntegrationStatus({ integration, result }) {
  const status = result?.status || integration?.status;
  const label = ['Ativo', 'Conectado'].includes(status)
    ? 'Conectado'
    : status?.startsWith('Erro') ? 'Erro' : 'Não conectado';
  return <span role="status"><Badge tone={label==='Conectado'?'positive':label==='Erro'?'negative':'neutral'}>{label}</Badge></span>;
}
