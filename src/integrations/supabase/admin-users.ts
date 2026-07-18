import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./types";

// supabaseAdmin.auth.admin.listUsers() defaults to page 1 / 50 results — every
// caller that needs the full user base (BI directory, supervisor lookup by
// email) was silently truncating past the 50th account. Page through until
// exhausted instead.
export async function listAllUsers(supabaseAdmin: SupabaseClient<Database>) {
  const perPage = 200;
  let page = 1;
  const all: User[] = [];

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return all;
}
