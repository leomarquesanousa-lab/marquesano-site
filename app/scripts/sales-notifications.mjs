// Run from the project root with the server's environment; never a public endpoint.
import { adminStore } from '../server/admin/core.mjs';
let store;
try {
  store=await adminStore();
  const result=await store.repository.billing.notifications.dispatch({limit:100});
  console.info('SALES_NOTIFICATIONS',result);
  if(!result.configured)process.exitCode=1;
} catch {
  console.error('SALES_NOTIFICATIONS_FAILED');process.exitCode=1;
} finally {if(store)await store.close();}
