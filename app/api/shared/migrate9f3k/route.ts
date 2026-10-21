import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

const FILES = [
  "0000_hard_nick_fury.sql",
  "0001_tiresome_squadron_supreme.sql",
  "0002_military_cobalt_man.sql",
  "0003_dashing_dust.sql",
  "0004_panoramic_hedge_knight.sql",
  "0005_tricky_mathemanic.sql",
  "0006_thick_lester.sql",
  "0007_careless_sentinel.sql",
  "0008_cute_dormammu.sql",
  "0009_overconfident_gateway.sql",
  "0010_brief_stellaris.sql",
  "0011_simple_vulcan.sql",
  "0012_steady_nitro.sql",
  "0013_illegal_senator_kelly.sql",
  "0014_jazzy_gressill.sql",
  "0015_majestic_chimera.sql",
  "0016_hesitant_thing.sql",
  "0017_superb_calypso.sql",
  "0018_conscious_tusk.sql",
];
const BASE =
  "https://raw.githubusercontent.com/3465125540/moemail/master/drizzle/";
const TABLE_QUERY =
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name";

async function listTables(DB: D1Database): Promise<string[]> {
  const res = await DB.prepare(TABLE_QUERY).all();
  return (res.results as { name: string }[]).map((r) => r.name);
}

export async function GET() {
  const DB = getRequestContext().env.DB as unknown as D1Database;
  const beforeNames = await listTables(DB);
  if (beforeNames.length > 0) {
    return NextResponse.json({
      status: "already-migrated",
      count: beforeNames.length,
      tables: beforeNames,
    });
  }
  let combined = "";
  for (const f of FILES) {
    const res = await fetch(BASE + f);
    if (!res.ok) {
      return NextResponse.json(
        { status: "fetch-failed", file: f, code: res.status },
        { status: 500 }
      );
    }
    combined += (await res.text()) + "\n";
  }
  const statements = combined
    .replace(/--> statement-breakpoint/g, "")
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("--") && !t.toUpperCase().startsWith("PRAGMA");
    })
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  let applied = 0;
  for (const stmt of statements) {
    try {
      await DB.prepare(stmt).run();
      applied++;
    } catch (e) {
      return NextResponse.json(
        {
          status: "exec-error",
          appliedBeforeError: applied,
          totalStatements: statements.length,
          failedStatement: stmt.slice(0, 200),
          error: String(e),
          tablesSoFar: await listTables(DB),
        },
        { status: 500 }
      );
    }
  }
  const names = await listTables(DB);
  return NextResponse.json({
    status: "migrated",
    statementsApplied: applied,
    count: names.length,
    tables: names,
  });
}
