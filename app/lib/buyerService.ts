import { supabase } from "./supabaseClient";

/**
 * Ensures public.users and public.buyers rows exist for the authenticated user.
 * Acts as a fallback for OAuth sign-ins where the DB trigger doesn't fire
 * (OAuth users don't have role: 'buyer' in raw_user_meta_data).
 */
export async function ensureBuyerProfile(userId: string, email: string): Promise<void> {
  // Check if the authenticated user already has a public profile row.
  const { data: existingUser, error: userLookupError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (userLookupError && userLookupError.code !== "PGRST116") {
    console.error("Error checking user profile:", {
      code: userLookupError.code,
      message: userLookupError.message,
      details: userLookupError.details,
      hint: userLookupError.hint,
    });
    return;
  }

  let publicUserId = existingUser?.id;

  if (!existingUser) {
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          email,
          role: "buyer",
        },
        { onConflict: "id" },
      )
      .select("id")
      .single();

    if (userError) {
      console.error("Error creating user profile:", {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
      });
      return;
    }
    publicUserId = newUser?.id;
  }

  if (!publicUserId) return;

  // Check if buyers row already exists
  const { data: existingBuyer, error: buyerLookupError } = await supabase
    .from("buyers")
    .select("id")
    .eq("user_id", publicUserId)
    .maybeSingle();

  if (buyerLookupError && buyerLookupError.code !== "PGRST116") {
    console.error("Error checking buyer profile:", {
      code: buyerLookupError.code,
      message: buyerLookupError.message,
      details: buyerLookupError.details,
      hint: buyerLookupError.hint,
    });
    return;
  }

  if (!existingBuyer) {
    const { error: buyerError } = await supabase
      .from("buyers")
      .insert({ user_id: publicUserId });

    if (buyerError) {
      console.error("Error creating buyer profile:", {
        code: buyerError.code,
        message: buyerError.message,
        details: buyerError.details,
        hint: buyerError.hint,
      });
    }
  }
}
