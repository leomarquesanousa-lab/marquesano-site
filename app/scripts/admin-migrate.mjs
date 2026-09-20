import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { DatabaseSync, backup } from 'node:sqlite';
import { adminStore, configured } from '../server/admin/core.mjs';
nextEnv.loadEnvConfig(fileURLToPath(new URL('../../',import.meta.url)),process.env.NODE_ENV!=='production');
if(!configured()){console.error('Configure o caminho privado do banco e a origem do admin antes de migrar.');process.exit(1);}
let source,store;
try {
  const file=process.env.ADMIN_DATABASE_PATH;
  if(existsSync(file)){
    source=new DatabaseSync(file,{readOnly:true});
    await backup(source,file+'.backup-'+new Date().toISOString().replace(/[:.]/g,'-'));
    source.close();source=null;console.log('Backup consistente criado no mesmo diretório privado do banco.');
  }
  store=adminStore();console.log('Migrations aplicadas. Usuários e sessões existentes preservados.');
} catch {console.error('Falha ao migrar. Verifique permissões e espaço no volume privado; nenhum segredo foi impresso.');process.exitCode=1;}
finally {source?.close();store?.close();}
