import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
import { contactConfigStatus } from "../server/contact.mjs";

// Resolve the directory containing package.json, independently of the shell cwd.
const root = fileURLToPath(new URL("../../", import.meta.url));
const { loadedEnvFiles } = nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production");
const status = contactConfigStatus();
console.log("Environment files:", loadedEnvFiles.map(file => file.path));
console.log("Contact configuration (validation only):", status);
console.log("CONTACT_SITE_ORIGIN:", Boolean(process.env.CONTACT_SITE_ORIGIN));
process.exitCode = Object.values(status).every(Boolean) ? 0 : 1;
