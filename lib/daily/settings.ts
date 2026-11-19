import "server-only";

// Personal subscription-first mode is the safe default. Only the operator can
// explicitly enable API-backed generation through server configuration.
export function apiGenerationEnabled() {
  return process.env.DAILY_API_GENERATION_ENABLED === "true";
}
