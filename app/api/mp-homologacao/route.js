import { homologation } from '../../server/admin/mp-homologation.mjs';
import { isInputError } from '../../server/admin/validation.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  try { return Response.json(await homologation(request), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return Response.json({ error: isInputError(error) ? error.message : 'Resultado não confirmado. Não repita a criação; confira a conta de teste e os logs.' }, { status: isInputError(error) ? error.status : 502, headers: { 'Cache-Control': 'no-store' } }); }
}
