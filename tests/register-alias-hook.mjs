// Loaded via `node --import ./tests/register-alias-hook.mjs` (see package.json's "test" script)
// to install the "@/*" -> "src/*" resolve hook before the test files import anything.
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);
