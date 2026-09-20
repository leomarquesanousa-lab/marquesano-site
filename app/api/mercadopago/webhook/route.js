import { handleMercadoPagoWebhook } from '../../../server/admin/mercadopago-webhook.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request) { return handleMercadoPagoWebhook(request); }
