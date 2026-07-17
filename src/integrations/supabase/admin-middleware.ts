import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

// Hardcoded allowlist for now — single admin, no roles table yet.
// Extend ADMIN_EMAILS (comma-separated) in .env to add more without a code change.
// This is the ONLY source of truth for admin status — client code must never
// duplicate this list (it previously did, via VITE_ADMIN_EMAILS, and the two
// could silently drift apart). Client-side gating goes through
// checkAdminStatus in admin.functions.ts, which calls isAdminEmail below.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// Use standalone: .middleware([requireAdmin]) — already includes the auth check.
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    if (!isAdminEmail(context.claims.email as string | undefined)) {
      throw new Error("Accès refusé : réservé à l'administrateur.");
    }
    return next();
  });
