const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {transformSync}=require('next/dist/build/swc');

test('batch sync attempts each plan once, keeps individual failures and refreshes saved IDs',async()=>{
  const {checkoutPlans}=await import('../config/checkout-plans.mjs');
  const data={configured:true,configuration:{access_token:true},plans:['basico','intermediario','professional'].map(id=>({id,revision:1,sync_state:'pending'}))};
  const state=[data],ref={current:false};let cursor=0;
  const dependencies={react:{useEffect:()=>{},useRef:()=>ref,useState:initial=>{
    const i=cursor++;if(!(i in state))state[i]=initial;
    return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];
  }},'../config/checkout-plans.mjs':{checkoutPlans},'./admin.module.css':{},'./billing-history.js':()=>null};
  const {code}=transformSync(fs.readFileSync('admin/payment-settings.js','utf8'),{filename:'payment-settings.js',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
  const mod={exports:{}};
  new Function('require','module','exports',code)(id=>Object.hasOwn(dependencies,id)?dependencies[id]:require(id),mod,mod.exports);
  const calls=[];
  const api=async(path)=>{
    calls.push(path);
    if(path.endsWith('/intermediario/sync'))throw Error('Confirme o preço deste plano antes de sincronizar.');
    if(path==='configuracoes/pagamentos')return data;
    return {plan:{...data.plans.find(p=>path.endsWith('/'+p.id+'/sync')),mercadopago_plan_id:'saved-id',sync_state:'synced'}};
  };
  function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
  const render=()=>{cursor=0;return mod.exports.default({api});};
  const button=nodes(render()).find(n=>n.type==='button'&&n.props.children==='Sincronizar planos');
  const pending=button.props.onClick();await button.props.onClick();await pending;
  assert.deepEqual(calls,['configuracoes/pagamentos/basico/sync','configuracoes/pagamentos/intermediario/sync','configuracoes/pagamentos/professional/sync','configuracoes/pagamentos']);
  const results=state[4];
  assert.deepEqual(results.map(p=>p.name),['Básico','Professional','Business']);
  assert.match(results[0].message,/sucesso/);assert.match(results[1].message,/preço/);assert.match(results[2].message,/sucesso/);
  assert.equal(ref.current,false);
});
