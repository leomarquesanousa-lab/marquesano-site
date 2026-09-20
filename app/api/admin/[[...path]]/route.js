import { handleAdminApi } from '../../../server/admin/api.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request, context) { return handleAdminApi(request, (await context.params).path || []); }
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD, handle as OPTIONS };
