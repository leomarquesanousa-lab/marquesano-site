import { createContactHandler } from "../../server/contact.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handle = createContactHandler();
export const GET = handle;
export const POST = handle;
