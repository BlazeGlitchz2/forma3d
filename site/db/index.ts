import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let cfEnv: any = {};
try {
  // @ts-ignore - only resolvable under workerd / vinext; Vercel Node.js falls to catch
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
