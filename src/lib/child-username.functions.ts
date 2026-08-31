import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const checkUsernameAvailabilityFn = createServerFn({ method: "POST" })
  .validator((username: unknown) => z.string().parse(username))
  .handler(async ({ data: username }) => {
    // Basic validation
    if (!username || username.length < 3 || username.length > 20) {
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return false;
    }

    // Bypasses RLS by calling our security definer function
    const { data, error } = await (supabaseAdmin as any).rpc("check_child_username_available", {
      requested_username: username,
    });

    if (error) {
      console.error("Error checking username availability:", error);
      return false; // Assume unavailable on error for safety
    }

    return data === true;
  });

export const searchChildProfilesFn = createServerFn({ method: "GET" })
  .validator((query: unknown) => z.string().parse(query))
  .handler(async ({ data: query }) => {
    if (!query || query.length < 2) return [];
    const cleanQuery = query.replace(/^@/, "").toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, username, avatar_color")
      .or(`username.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`)
      .limit(10);
    if (error) {
      console.error("Error searching child profiles:", error);
      return [];
    }
    return data || [];
  });
