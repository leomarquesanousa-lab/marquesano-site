import { adminStore, configured } from '../../../server/admin/core.mjs';
import { InputError, isInputError, readJson } from '../../../server/admin/validation.mjs';
import { startCheckout } from '../../../server/admin/mercadopago.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export async function POST(request,{params}) {
  try {
    if(!configured())throw new InputError('Contratação temporariamente indisponível.',503);
    if(request.headers.get('origin')!==process.env.ADMIN_SITE_ORIGIN)throw new InputError('Origem inválida.',403);
    const data=await readJson(request,512),{plan}=await params;
    return json({url:await startCheckout(adminStore().repository.plans,plan,data.revision)});
  }catch(error){return json({error:isInputError(error)?error.message:'Contratação temporariamente indisponível.'},isInputError(error)?error.status:503);}
}
