import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getAuthenticatedSupabase(request: Request): SupabaseClient | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const supabase = getAuthenticatedSupabase(request);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const buyerId = authData.user.id;

  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const content = body.content ?? "";

  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  const slug = slugify(title);
  if (!slug) {
    return Response.json(
      { error: "Title must contain at least one letter or number" },
      { status: 400 },
    );
  }
  if (!content.trim()) {
    return Response.json({ error: "Content cannot be empty" }, { status: 400 });
  }

  // Make sure the body has a top-level heading so the graph picks up the title.
  const finalContent = /^#\s+/m.test(content) ? content : `# ${title}\n\n${content}`;

  const { error: insErr } = await supabase
    .from("kb_notes")
    .insert({ id: slug, buyer_id: buyerId, title, content: finalContent });

  if (insErr) {
    // 23505 = unique_violation (PK collision on (buyer_id, id))
    if (insErr.code === "23505") {
      return Response.json(
        { error: `A note with id "${slug}" already exists` },
        { status: 409 },
      );
    }
    return Response.json(
      { error: `Save failed: ${insErr.message}` },
      { status: 500 },
    );
  }

  return Response.json({ id: slug, title });
}
