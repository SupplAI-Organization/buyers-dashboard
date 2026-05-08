-- Wallet schema for buyer-side dummy wallet
-- Run this in the Supabase SQL editor.

create table if not exists public.wallets (
    id uuid primary key default gen_random_uuid(),
    buyer_id uuid not null references auth.users(id) on delete cascade,
    balance numeric(12, 2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (buyer_id)
);

create table if not exists public.wallet_transactions (
    id uuid primary key default gen_random_uuid(),
    wallet_id uuid not null references public.wallets(id) on delete cascade,
    buyer_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('credit', 'debit')),
    amount numeric(12, 2) not null check (amount > 0),
    balance_after numeric(12, 2) not null,
    description text,
    stripe_session_id text,
    order_id uuid,
    created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_buyer_idx
    on public.wallet_transactions (buyer_id, created_at desc);

create index if not exists wallet_transactions_session_idx
    on public.wallet_transactions (stripe_session_id);

-- RLS
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "wallets_self_select" on public.wallets;
create policy "wallets_self_select" on public.wallets
    for select using (auth.uid() = buyer_id);

drop policy if exists "wallets_self_insert" on public.wallets;
create policy "wallets_self_insert" on public.wallets
    for insert with check (auth.uid() = buyer_id);

drop policy if exists "wallets_self_update" on public.wallets;
create policy "wallets_self_update" on public.wallets
    for update using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

drop policy if exists "wtx_self_select" on public.wallet_transactions;
create policy "wtx_self_select" on public.wallet_transactions
    for select using (auth.uid() = buyer_id);

drop policy if exists "wtx_self_insert" on public.wallet_transactions;
create policy "wtx_self_insert" on public.wallet_transactions
    for insert with check (auth.uid() = buyer_id);

-- Atomic credit (top-up) — verifies caller is owner.
create or replace function public.wallet_credit(
    p_amount numeric,
    p_description text default null,
    p_stripe_session_id text default null
) returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_wallet public.wallets;
begin
    if v_user is null then
        raise exception 'not authenticated';
    end if;
    if p_amount is null or p_amount <= 0 then
        raise exception 'amount must be positive';
    end if;

    -- Idempotency: if a credit with this stripe session already exists, return current wallet
    if p_stripe_session_id is not null then
        if exists (
            select 1 from public.wallet_transactions
            where stripe_session_id = p_stripe_session_id and type = 'credit'
        ) then
            select * into v_wallet from public.wallets where buyer_id = v_user;
            return v_wallet;
        end if;
    end if;

    insert into public.wallets (buyer_id, balance)
    values (v_user, 0)
    on conflict (buyer_id) do nothing;

    update public.wallets
       set balance = balance + p_amount,
           updated_at = now()
     where buyer_id = v_user
    returning * into v_wallet;

    insert into public.wallet_transactions
        (wallet_id, buyer_id, type, amount, balance_after, description, stripe_session_id)
    values
        (v_wallet.id, v_user, 'credit', p_amount, v_wallet.balance, p_description, p_stripe_session_id);

    return v_wallet;
end;
$$;

-- Atomic debit — fails if insufficient balance.
create or replace function public.wallet_debit(
    p_amount numeric,
    p_description text default null,
    p_order_id uuid default null
) returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_wallet public.wallets;
begin
    if v_user is null then
        raise exception 'not authenticated';
    end if;
    if p_amount is null or p_amount <= 0 then
        raise exception 'amount must be positive';
    end if;

    select * into v_wallet from public.wallets where buyer_id = v_user for update;
    if not found then
        raise exception 'wallet not found';
    end if;
    if v_wallet.balance < p_amount then
        raise exception 'insufficient_balance';
    end if;

    update public.wallets
       set balance = balance - p_amount,
           updated_at = now()
     where id = v_wallet.id
    returning * into v_wallet;

    insert into public.wallet_transactions
        (wallet_id, buyer_id, type, amount, balance_after, description, order_id)
    values
        (v_wallet.id, v_user, 'debit', p_amount, v_wallet.balance, p_description, p_order_id);

    return v_wallet;
end;
$$;

grant execute on function public.wallet_credit(numeric, text, text) to authenticated;
grant execute on function public.wallet_debit(numeric, text, uuid) to authenticated;
