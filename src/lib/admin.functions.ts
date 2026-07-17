import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/integrations/supabase/admin-middleware";

// Lets any authenticated user ask "am I admin?" without throwing (unlike
// requireAdmin) — used purely to decide whether to show admin UI. The real
// authorization for admin actions still goes through requireAdmin server-side.
export const checkAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: isAdminEmail(context.claims.email as string | undefined) };
  });
