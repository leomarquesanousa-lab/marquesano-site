// Isolated rendering fixtures. Never imported by application routes.
const fs=require('node:fs'),path=require('node:path');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {transformSync}=require('next/dist/build/swc');
const stamp='2026-09-22T12:00:00.000Z';
const record={id:'test-subscription',plan_name:'Básico',customer_name:'Cliente de teste',payer_email:'buyer@example.invalid',amount_cents:9900,currency:'BRL',total_paid_currency:'BRL',status:'authorized',created_at:stamp,next_payment_date:'2026-10-22T12:00:00.000Z',charges:1,paid_cycles:1,cycles:12,total_paid:9900,remaining_cycles:11,remaining_amount:108900,external_reference:'test-reference'};
const fixtures={
  list:{rows:[record],page:1,total:1,limit:25,summary:{active:1,new_month:1,revenue_month:9900,mrr:9900,approved:1,rejected:0,pending:0,cancellations:0,upcoming7:0,upcoming30:1,unknown_amounts:0},upcoming:{rows:[record],page:1,total:1,limit:25}},
  detail:{record,payments:[{id:'test-payment',created_at:stamp,paid_at:stamp,status:'approved',amount_cents:9900,currency:'BRL',payment_method:'master',last_four:'1234',refunded_cents:0}],invoices:[],communications:[{type:'welcome',recipient:record.payer_email,state:'SENT',created_at:stamp,sent_at:stamp}]},
};
fixtures.empty={...fixtures.list,rows:[],total:0,summary:Object.fromEntries(Object.keys(fixtures.list.summary).map(k=>[k,0])),upcoming:{rows:[],page:1,total:0,limit:25}};
function renderSales(kind='list') {
  const cache=new Map();let hook=0;
  function load(file) {
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const {code}=transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
    new Function('require','module','exports',code)(id=>{
      if(id.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
      if(id==='react'&&file.endsWith('sales-section.js'))return {...React,useEffect:()=>{},useState:initial=>[hook++===0?fixtures[kind]:initial,()=>{}]};
      if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id));
      return require(id);
    },module,module.exports);
    return module.exports;
  }
  const Component=load(path.join(__dirname,'../admin/sales-section.js')).default;
  const markup=renderToStaticMarkup(React.createElement(Component,{api:()=>{throw Error('No network in render fixture');},recordId:kind==='detail'?'test-subscription':null}));
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+fs.readFileSync(path.join(__dirname,'../admin/admin.module.css'),'utf8')+'</style></head><body><div class="admin"><main class="content"><h1>Vendas</h1>'+markup+'</main></div></body></html>';
}
module.exports={renderSales};
