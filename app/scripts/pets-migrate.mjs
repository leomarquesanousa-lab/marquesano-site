import {loadLocalCheckoutEnv} from './local-env.mjs';
loadLocalCheckoutEnv();
const {adminDatabase}=await import('../server/admin/core.mjs');
const {migratePets}=await import('../pets/lib/migrate.mjs');
let database;
try{database=await adminDatabase();await migratePets(database);console.log('Migrations Pets aplicadas no PostgreSQL Marquesano.');}catch(error){console.error('Migration Pets não concluída:',error.message);process.exitCode=1;}
finally{await database?.close();}
