import { supabase } from "./supabaseClient";

/**
 * Ensures public.users and public.buyers rows exist for the authenticated user.
 * Acts as a fallback for OAuth sign-ins where the DB trigger doesn't fire
 * (OAuth users don't have role: 'buyer' in raw_user_meta_data).
 */
export async function ensureBuyerProfile(userId: string, email: string): Promise<void> {
  // Check if users row already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  let publicUserId = existingUser?.id;

  if (!existingUser) {
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({ email, role: "buyer" })
      .select("id")
      .single();

    if (userError) {
      console.error("Error creating user profile:", userError);
      return;
    }
    publicUserId = newUser?.id;
  }

  if (!publicUserId) return;

  // Check if buyers row already exists
  const { data: existingBuyer } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", publicUserId)
    .single();

  if (!existingBuyer) {
    const { error: buyerError } = await supabase
      .from("buyers")
      .insert({ user_id: publicUserId });

    if (buyerError) {
      console.error("Error creating buyer profile:", buyerError);
    }
  }
}
