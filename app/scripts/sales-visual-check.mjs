import { spawn } from 'node:child_process';
import { existsSync,mkdtempSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { salesEmail } from '../server/admin/sales-mail.mjs';
const {renderSales}=createRequire(import.meta.url)('./sales-ui-render.cjs');
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!chrome)throw Error('Browser unavailable');
const output=mkdtempSync(join(tmpdir(),'marquesano-sales-')),port=9447;
const browser=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run',`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1',`--user-data-dir=${join(output,'profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));let socket;
try {
  let target;for(let i=0;i<40;i++){try{target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');if(target)break;}catch{}await pause(250);}
  if(!target)throw Error('Browser did not start');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let serial=0;const pending=new Map();
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser timeout'));},15000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:()=>{clearTimeout(timer);reject(Error('Browser operation failed'));}});socket.send(JSON.stringify({id,method,params}));});
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const op=pending.get(m.id);pending.delete(m.id);if(m.error)op?.reject();else op?.resolve(m.result);}});
  await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['http://*','https://*']});
  const frame=(await send('Page.getFrameTree')).frameTree.frame.id;
  const pages=Object.fromEntries(['list','empty','detail'].map(k=>['sales-'+k,renderSales(k)]));
  for(const type of ['welcome','approved','rejected','cancelled'])pages['email-'+type]=salesEmail(type,{name:'Cliente de teste',plan_name:'Básico',amount_cents:9900,currency:'BRL',cycles:12,created_at:'2026-09-22T12:00:00.000Z',next_payment_date:'2026-10-22T12:00:00.000Z',payment_amount:9900,payment_date:'2026-09-22T12:00:00.000Z',cancelled_at:'2026-09-22T12:00:00.000Z'}).html;
  for(const [name,html] of Object.entries(pages))for(const width of [390,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    await send('Page.setDocumentContent',{frameId:frame,html});await pause(100);
    const result=await send('Runtime.evaluate',{expression:'JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth,buttons:document.querySelectorAll("button,a").length})',returnByValue:true});
    const layout=JSON.parse(result.result.value);assert(layout.scroll<=layout.width,`Page overflow: ${name} ${width}`);assert(layout.buttons>0);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(output,`${name}-${width}.png`),Buffer.from(shot.data,'base64'));
    console.info('SALES_VISUAL_OK',{name,width});
  }
  console.info('SALES_VISUAL_ARTIFACTS',output);
}finally{socket?.close();browser.kill();}
