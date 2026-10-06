import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type CloudflareD1Env = { DB?: D1Database };

let cfEnv: CloudflareD1Env = {};
try {
  // "cloudflare:workers" is only resolvable under workerd / vinext at runtime.
  // The module is declared by @cloudflare/workers-types, so no ts-ignore is needed.
  cfEnv = (await import("cloudflare:workers")).env;
} catch {
  cfEnv = {};
}

export function getDb() {
  const d1 = cfEnv?.DB;
  if (!d1) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(d1, { schema });
}
