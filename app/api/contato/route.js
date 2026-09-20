import { createContactHandler } from "../../server/contact.mjs";
import { contactPersistence } from '../../server/marketing.mjs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = createContactHandler({persistence:contactPersistence()});
export const GET = handle;
export const POST = handle;
