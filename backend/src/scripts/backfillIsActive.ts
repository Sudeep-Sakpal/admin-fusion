import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { ProblemStatement, Track, User } from "../models";

/**
 * Backfills `isActive: true` on documents created before that field
 * existed (User/Track/ProblemStatement gained it in M3–M4).
 *
 * Why this is needed: queries filter on `{ isActive: true }`, and a missing
 * field does NOT match that filter. Documents written before the field was
 * introduced would therefore silently disappear — tracks would vanish from
 * selection, problem statements would be unlistable, and users would be
 * treated as deactivated. Mongoose defaults only apply to newly created
 * documents, so they do not repair existing rows.
 *
 * Properties:
 *  - Explicit: run manually via `npm run migrate:is-active`; never invoked
 *    on application startup.
 *  - Idempotent: only touches documents where the field is absent, so
 *    re-running it is a no-op that reports 0 changes.
 *  - Non-destructive: only ever adds a field; never deletes or overwrites
 *    an existing value (a deliberately deactivated record stays deactivated).
 *  - Reports exactly what it changed, and supports --dry-run to preview.
 */

const DRY_RUN = process.argv.includes("--dry-run");

const TARGETS: { name: string; model: mongoose.Model<any> }[] = [
  { name: "User", model: User },
  { name: "Track", model: Track },
  { name: "ProblemStatement", model: ProblemStatement },
];

async function migrate() {
  await connectDB();

  console.log(
    `Backfilling isActive on database "${mongoose.connection.name}"` +
      (DRY_RUN ? " [DRY RUN — no writes will be performed]" : "")
  );

  let totalMissing = 0;
  let totalUpdated = 0;

  for (const { name, model } of TARGETS) {
    // Absent field only — documents that already have isActive (true OR
    // false) are intentionally left untouched.
    const filter = { isActive: { $exists: false } };

    const missing = await model.countDocuments(filter);
    totalMissing += missing;

    if (missing === 0) {
      console.log(`  ${name}: 0 documents missing isActive — nothing to do`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${name}: ${missing} document(s) WOULD be set to isActive: true`);
      continue;
    }

    const result = await model.updateMany(filter, { $set: { isActive: true } });
    totalUpdated += result.modifiedCount;
    console.log(
      `  ${name}: ${missing} document(s) missing isActive, ${result.modifiedCount} updated`
    );
  }

  console.log(
    DRY_RUN
      ? `Dry run complete: ${totalMissing} document(s) would be updated.`
      : `Migration complete: ${totalUpdated} document(s) updated.`
  );

  if (!DRY_RUN && totalMissing !== totalUpdated) {
    console.warn(
      `Warning: expected to update ${totalMissing} document(s) but updated ` +
        `${totalUpdated}. Re-run to confirm the final state.`
    );
  }
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
