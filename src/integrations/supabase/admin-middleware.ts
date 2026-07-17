import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

// Hardcoded allowlist for now — single admin, no roles table yet.
// Extend ADMIN_EMAILS (comma-separated) in .env to add more without a code change.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Use standalone: .middleware([requireAdmin]) — already includes the auth check.
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const email = (context.claims.email as string | undefined)?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw new Error("Accès refusé : réservé à l'administrateur.");
    }
    return next();
  });
