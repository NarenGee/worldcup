import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { backfillDailySummaries } from "../lib/daily-summary";
import type { Database } from "../lib/supabase/types";

function loadEnvFile(filename: string) {
  try {
    const fileContents = readFileSync(resolve(process.cwd(), filename), "utf8");
    for (const line of fileContents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // env file optional when vars are already exported
  }
}

loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceRoleKey);
const force = process.argv.includes("--force");

async function main() {
  console.log(`Backfilling daily recaps${force ? " (force regenerate)" : ""}...`);

  const results = await backfillDailySummaries(supabase, { force });

  for (const result of results) {
    if (result.status === "generated") {
      console.log(`✓ ${result.date} — generated (${result.source})`);
    } else if (result.reason === "cache") {
      console.log(`· ${result.date} — already cached`);
    } else {
      console.log(`· ${result.date} — skipped (no matches)`);
    }
  }

  const generated = results.filter((result) => result.status === "generated").length;
  const skipped = results.length - generated;
  console.log(`\nDone: ${generated} generated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
