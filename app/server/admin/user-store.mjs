import { randomUUID } from 'node:crypto';
import { hashPassword, roles } from './core.mjs';
import { InputError, email, text } from './validation.mjs';

export function createUserStore(db, now=Date.now) {
  const time=()=>new Date(now()).toISOString();
  const one=(sql,...args)=>db.prepare(sql).get(...args);
  const run=(sql,...args)=>db.prepare(sql).run(...args);
  async function actorRecord(actor) {
    const user=await one('SELECT id,role,active,deleted_at FROM users WHERE id=?',actor?.id);
    if(!user?.active||user.deleted_at||!['OWNER','ADMIN'].includes(user.role))throw new InputError('Acesso não permitido.',403);
    return user;
  }
  const audit=(actor,action,id)=>run('INSERT INTO audit_log(id,actor_id,action,entity,entity_id,created_at) VALUES(?,?,?,?,?,?)',randomUUID(),actor.id,action,'usuarios',id,time());
  async function password(data) {
    if(typeof data.password!=='string'||data.password!==data.confirm_password)throw new InputError('A confirmação da senha não confere.');
    if(data.password.length<12||Buffer.byteLength(data.password)>256)throw new InputError('Use uma senha de 12 caracteres ou mais (máximo de 256 bytes).');
    return hashPassword(data.password);
  }
  async function mutate(action,data,actor,id) {
    // Reject hidden password changes in the profile endpoint.
    const allowed=action==='save'?(id?['name','email','role','active']:['name','email','role','active','password','confirm_password']):action==='password'?['password','confirm_password']:action==='status'?['active']:[];
    if(Object.keys(data).some(key=>!allowed.includes(key)))throw new InputError('Campo não permitido nesta ação.');
    try {return await db.transaction(async()=>{
      let invalidate=false;
      const current=await actorRecord(actor);
      const old=id?await one('SELECT id,name,email,role,active,deleted_at FROM users WHERE id=?',id):null;
      if(id&&(!old||old.deleted_at))throw new InputError('Usuário não encontrado ou excluído.',404);
      if(old?.role==='OWNER'&&current.role!=='OWNER')throw new InputError('Somente OWNER pode alterar outro OWNER.',403);
      const role=action==='save'?data.role:old?.role;
      if(!roles.includes(role))throw new InputError('Role inválida.');
      if(role==='OWNER'&&current.role!=='OWNER')throw new InputError('Somente OWNER pode atribuir a role OWNER.',403);
      const active=action==='delete'?false:['save','status'].includes(action)?data.active:Boolean(old?.active);
      if(typeof active!=='boolean')throw new InputError('Status inválido.');
      if(old?.id===current.id&&(action==='delete'||!active||role!==old.role))throw new InputError('Não é permitido bloquear ou reduzir o próprio acesso.',409);
      if(old?.role==='OWNER'&&old.active&&(!active||role!=='OWNER')&&Number((await one("SELECT count(*) n FROM users WHERE role='OWNER' AND active=1 AND deleted_at IS NULL")).n)<=1)throw new InputError('Não é possível remover o último OWNER ativo.',409);
      if(action==='save') {
        const name=text(data.name,100),address=email(data.email);
        if(await one('SELECT id FROM users WHERE lower(email)=lower(?) AND id<>?',address,id||''))throw new InputError('E-mail já cadastrado.',409);
        if(!old) {
          const hash=await password(data);id=randomUUID();
          await run('INSERT INTO users(id,name,email,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?)',id,name,address,hash,role,Number(active),time());
          await audit(current,'user_created',id);
        } else {
          await run('UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?',name,address,role,Number(active),id);
          await audit(current,'user_updated',id);
          if(old.role!==role)await audit(current,'user_role_changed',id);
          if(Boolean(old.active)!==active)await audit(current,active?'user_activated':'user_deactivated',id);
          if(old.email!==address||old.role!==role||Boolean(old.active)!==active){await run('DELETE FROM sessions WHERE user_id=?',id);invalidate=true;}
        }
      } else if(action==='password') {
        await run('UPDATE users SET password_hash=? WHERE id=?',await password(data),id);
        await run('DELETE FROM sessions WHERE user_id=?',id);
        invalidate=true;
        await audit(current,'user_password_reset',id);
      } else if(action==='status') {
        await run('UPDATE users SET active=? WHERE id=?',Number(active),id);
        if(!active)await run('DELETE FROM sessions WHERE user_id=?',id);
        if(Boolean(old.active)!==active)await audit(current,active?'user_activated':'user_deactivated',id);
      } else if(action==='delete') {
        await run('UPDATE users SET active=0,deleted_at=? WHERE id=?',time(),id);
        await run('DELETE FROM sessions WHERE user_id=?',id);
        await audit(current,'user_deleted',id);
      } else throw new InputError('Ação inválida.',405);
      return {id,session_invalidated:current.id===id&&invalidate};
    });}catch(error){if(error.code==='23505')throw new InputError('E-mail já cadastrado.',409);throw error;}
  }
  return {
    async list(params,actor) {
      await actorRecord(actor);
      const page=Number(params.get('page')||1);
      if(!Number.isInteger(page)||page<1||page>10000)throw new InputError('Página inválida.');
      const rows=await db.prepare("SELECT u.id,u.name,u.email,u.role,u.active,u.created_at,u.deleted_at,(SELECT max(a.created_at) FROM audit_log a WHERE a.actor_id=u.id AND a.action='login') AS last_login FROM users u ORDER BY u.deleted_at NULLS FIRST,u.email LIMIT 25 OFFSET ?").all((page-1)*25);
      return {rows,total:Number((await one('SELECT count(*) n FROM users')).n),page,limit:25};
    },
    save:(data,actor,id)=>mutate('save',data,actor,id),
    password:(id,data,actor)=>mutate('password',data,actor,id),
    status:(id,data,actor)=>mutate('status',data,actor,id),
    remove:(id,actor)=>mutate('delete',{},actor,id),
  };
}
