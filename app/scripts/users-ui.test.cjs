const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),{transformSync}=require('next/dist/build/swc');
const owner={id:'owner',email:'owner@example.invalid',name:'Owner',role:'OWNER',active:1},viewer={id:'viewer',email:'viewer@example.invalid',name:'Pessoa',role:'VIEWER',active:1};
function render({user=owner,editing=null,passwordUser=null}={}){
  const data={rows:[owner,viewer,{...viewer,id:'deleted',email:'deleted@example.invalid',active:0,deleted_at:'2026-09-22T12:00:00Z'}],total:3,page:1,limit:25};
  const values=[data,1,0,editing,passwordUser,'','',false];let index=0;
  const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
    const {code}=transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
    new Function('require','module','exports',code)(id=>{if(id.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};if(id==='react'&&file.endsWith('users-section.js'))return {...React,useState:()=>[values[index++],()=>{}],useEffect:()=>{}};if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id));return require(id);},module,module.exports);return module.exports;
  }
  const Component=load(path.join(__dirname,'../admin/users-section.js')).default;
  return renderToStaticMarkup(React.createElement(Component,{api:()=>{},user}));
}
test('users list exposes requested columns and preserved deleted accounts',()=>{const html=render();for(const label of ['Novo usuário','Nome','E-mail','Role','Status','Criação','Último login','Editar','Alterar senha','Desativar','Excluir','Histórico preservado'])assert(html.includes(label),label);assert(!html.includes('password_hash'));});
test('creation form requests confirmation and safe minimum password',()=>{const html=render({editing:{name:'',email:'',role:'VIEWER',active:true}});assert(html.includes('name="confirm_password"'));assert(html.includes('minLength="12"'));for(const label of ['Dados','Permissões','Segurança'])assert(html.includes(label));});
test('editing profile has no password field, reset is a separate form',()=>{const edit=render({editing:viewer});assert(!edit.includes('type="password"'));const reset=render({passwordUser:viewer});assert.equal((reset.match(/type="password"/g)||[]).length,2);assert(reset.includes('Todas as sessões desse usuário serão encerradas.'));});
test('ADMIN UI does not offer OWNER role and marks owner as protected',()=>{const html=render({user:{id:'admin',role:'ADMIN'},editing:viewer});assert(!html.includes('<option>OWNER</option>'));assert(html.includes('Gerenciado por OWNER'));});
