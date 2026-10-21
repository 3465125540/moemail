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

export async function GET() {
  const DB = getRequestContext().env.DB as unknown as D1Database;
  const before = await DB.prepare(TABLE_QUERY).all();
  const beforeNames = (before.results as { name: string }[]).map((r) => r.name);
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
  const cleaned = combined
    .split("\n")
    .filter((l) => !l.trim().toUpperCase().startsWith("PRAGMA"))
    .join("\n");
  try {
    await DB.exec(cleaned);
  } catch (e) {
    const now = await DB.prepare(TABLE_QUERY).all();
    return NextResponse.json(
      {
        status: "exec-error",
        error: String(e),
        tablesSoFar: (now.results as { name: string }[]).map((r) => r.name),
      },
      { status: 500 }
    );
  }
  const after = await DB.prepare(TABLE_QUERY).all();
  const names = (after.results as { name: string }[]).map((r) => r.name);
  return NextResponse.json({ status: "migrated", count: names.length, tables: names });
}
