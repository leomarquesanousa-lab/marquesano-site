const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server'),{transformSync}=require('next/dist/build/swc');
function render(section='',confirm=false){let hook=0;const cache=new Map();const row={id:'11',name:'Campanha <script>alert(1)</script>',status:'PAUSED',effective_status:'PAUSED',metrics:{spend:2,clicks:4}};const data={campaigns:[row],adsets:[],ads:[],spend:{today:2,'7':2,'30':2},totals:{},timeline:[]};
  function load(file){file=path.resolve(file);if(!path.extname(file))file+='.js';if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const {code}=transformSync(fs.readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
    new Function('require','module','exports',code)(id=>{if(id.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,k)=>k})};if(id==='react'&&file.endsWith('meta-ads-section.js'))return {...React,useEffect:()=>{},useState:initial=>{const n=hook++;return [n===0?{account:{id:'act_789',name:'Conta teste',currency:'BRL'},read:true,manage:true,expiresAt:'2030-01-01',ai:{text:false,image:false}}:n===1?data:n===10&&confirm?{review:{action:'status',before:row,after:{status:'ACTIVE'}}}:initial,()=>{}]}};if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id));return require(id);},module,module.exports);return module.exports;}
  const C=load(path.join(__dirname,'../admin/meta-ads-section.js')).default;return renderToStaticMarkup(React.createElement(C,{path:section?[section]:[]}));
}

module.exports={render};
