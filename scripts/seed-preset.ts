import { upsertPresetByName } from "../src/providers/persistence/sqlite-run-history.ts";
import { PRE_RELEASE_DEFAULT_PRESET } from "../src/runtime/server/default-presets.ts";

const preset = upsertPresetByName(PRE_RELEASE_DEFAULT_PRESET);
console.log(`Seeded preset "${preset.name}" with id ${preset.id}`);
