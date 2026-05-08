-- Agent chat persistence schema
-- Run this once in the Supabase SQL editor (https://supabase.com/dashboard/project/_/sql).
-- It creates two tables, indexes, and RLS policies so each buyer can only
-- read/write their own conversations and messages.

-- ── 1. Conversations ────────────────────────────────────────────────────────
create table if not exists public.agent_conversations (
  id          uuid primary key,
  buyer_id    uuid not null references auth.users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists agent_conversations_buyer_idx
  on public.agent_conversations (buyer_id, updated_at desc);

-- ── 2. Messages ─────────────────────────────────────────────────────────────
-- IDs are strings produced by the AI SDK (not UUIDs), so use text.
-- `parts` stores the rich UIMessage payload (text, tool calls, tool results).
create table if not exists public.agent_messages (
  id              text primary key,
  conversation_id uuid not null references public.agent_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system', 'tool')),
  parts           jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists agent_messages_conversation_idx
  on public.agent_messages (conversation_id, created_at);

-- ── 3. Row-level security ──────────────────────────────────────────────────
alter table public.agent_conversations enable row level security;
alter table public.agent_messages      enable row level security;

-- Conversations: buyer can read/insert/update/delete only their own rows.
drop policy if exists "buyer manages own conversations" on public.agent_conversations;
create policy "buyer manages own conversations"
  on public.agent_conversations
  for all
  to authenticated
  using  (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

-- Messages: tied to a conversation that the buyer owns.
drop policy if exists "buyer manages own messages" on public.agent_messages;
create policy "buyer manages own messages"
  on public.agent_messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.agent_conversations c
      where c.id = agent_messages.conversation_id
        and c.buyer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agent_conversations c
      where c.id = agent_messages.conversation_id
        and c.buyer_id = auth.uid()
    )
  );
