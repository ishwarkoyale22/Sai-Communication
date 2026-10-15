// Node ESM resolve hook so `node --test` can follow the same "@/*" -> "src/*" alias that
// tsconfig.json/vite define for the app build. Needed because payment.server.ts (and anything
// it imports) uses "@/..." imports, which plain Node can't resolve on its own — without this,
// `npm test` can only exercise files with zero "@/" imports in their module graph (as
// razorpay-provider.test.ts happened to), silently leaving payment.server.ts untested.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC_ROOT = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src") + path.sep,
).href;

const CANDIDATE_EXTENSIONS = [".ts", ".tsx", "/index.ts"];

// Vite/tsconfig resolve extensionless relative imports (e.g. "./client.server"); plain Node ESM
// does not. Only src/**/*.ts files written for the bundler hit this — retry with each extension
// rather than touching that app source, which is written once for Vite and shouldn't need a
// test-runner-specific tweak.
async function resolveWithExtensionFallback(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND" && err?.code !== "ERR_UNSUPPORTED_DIR_IMPORT") {
      throw err;
    }
    for (const ext of CANDIDATE_EXTENSIONS) {
      try {
        return await nextResolve(specifier + ext, context);
      } catch {
        // try the next candidate
      }
    }
    throw err;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rewritten = SRC_ROOT + specifier.slice(2);
    return resolveWithExtensionFallback(rewritten, context, nextResolve);
  }
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return resolveWithExtensionFallback(specifier, context, nextResolve);
  }
  return nextResolve(specifier, context);
}
