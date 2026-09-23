const test=require('node:test'),assert=require('node:assert/strict');
const {render}=require('./meta-ads-ui-render.cjs');
for(const section of ['','campanhas','conjuntos','anuncios','nova','assistente','criativos','conversoes','historico'])test('Meta Ads renders '+(section||'overview'),()=>{const html=render(section);assert(html.includes('Conta teste'));assert(!html.includes('<script>alert'));assert(!html.includes('access_token'));});
test('writes require explicit modal separate from draft creation',()=>{const html=render('campanhas',true);assert(html.includes('role="dialog"'));assert(html.includes('Confirmo esta alteração na Meta'));assert(html.includes('afetar gastos'));});
