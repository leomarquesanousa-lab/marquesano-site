export function adminDiagnostic(stage, error) {
  if (!error) {console.info(stage);return;}
  // Allowlisted classifications only: never emit arbitrary exception text or stacks.
  const message = typeof error.message === 'string' ? error.message : '';
  const categories = [
  [/DATABASE_URL ausente/i, 'DATABASE_URL ausente no processo.'],
  [/DATABASE_URL.*inválid|Configuração administrativa inválida/i, 'Configuração administrativa inválida; consulte o estágio anterior.'],
  [/permission denied|operation not permitted|readonly|read-only/i, 'Permissão negada ou armazenamento somente leitura.'],
  [/no such file|unable to open database/i, 'Arquivo ou diretório indisponível para abertura.'],
  [/database is locked|database is busy/i, 'Banco bloqueado ou ocupado.'],
  [/no space left|database or disk is full/i, 'Armazenamento sem espaço.'],
  [/not a database|database disk image is malformed/i, 'Dados do banco inválidos ou corrompidos.'],
  [/password authentication failed/i, 'Autenticação PostgreSQL recusada.'],
  [/connect ECONNREFUSED|connection terminated|timeout|ENOTFOUND/i, 'Conexão PostgreSQL indisponível.'],
  [/certificate|self.signed/i, 'Falha na validação TLS do PostgreSQL.'],
  [/relation .* does not exist|column .* does not exist/i, 'Schema PostgreSQL incompleto.'],
  [/no such table|no such column|duplicate column|syntax error/i, 'Erro de schema ou sintaxe SQL.'],
  [/constraint failed/i, 'Violação de restrição do banco.'],
  [/Provisionamento administrativo:.*PASSWORD_HASH inválido/i, 'Hash de provisionamento com formato inválido.'],
  [/Provisionamento administrativo:.*EMAIL inválido/i, 'E-mail de provisionamento com formato inválido.'],
  [/Provisionamento administrativo: configure/i, 'Variáveis obrigatórias de provisionamento ausentes.']];

  const name = ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'SystemError'].includes(error.name) ? error.name : 'Error';
  const code = typeof error.code === 'string' && /^(?:[0-9A-Z]{5}|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EACCES|EPERM|ENOSPC|ERR_INVALID_ARG_TYPE|ERR_INVALID_ARG_VALUE)$/.test(error.code) ? error.code : undefined;
  console.error({ stage, name, ...(code ? { code } : {}), message: categories.find(([pattern]) => pattern.test(message))?.[1] || 'Detalhes da exceção omitidos por segurança.' });
}
