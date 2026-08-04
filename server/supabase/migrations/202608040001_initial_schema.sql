create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'merchant' check (role in ('merchant', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  momo_phone text not null check (momo_phone ~ '^\+?233[0-9]{9}$'),
  momo_network text not null default 'MTN' check (momo_network in ('MTN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  address text not null,
  chain_id integer not null default 11155111,
  created_at timestamptz not null default now(),
  unique(address, chain_id)
);

create table public.invoices (
  id uuid primary key,
  reference text not null unique,
  onchain_id text not null unique,
  onchain_creation_tx_hash text,
  merchant_id uuid not null references public.merchants(id),
  amount_ghs numeric(14,2) not null check (amount_ghs > 0),
  status text not null check (status in ('PENDING', 'PROCESSING', 'PAID', 'FAILED')),
  qr_payload text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key,
  invoice_reference text not null unique references public.invoices(reference),
  tx_hash text not null unique,
  sender_address text not null,
  asset text not null check (asset in ('ETH', 'USDC')),
  crypto_amount numeric not null check (crypto_amount > 0),
  amount_ghs numeric(14,2) not null,
  exchange_rate numeric not null,
  chain_id integer not null,
  confirmed_at timestamptz not null
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments(id),
  status text not null check (status in ('NOT_STARTED', 'PROCESSING', 'SUCCESS', 'FAILED')),
  network text not null,
  reference text unique,
  completed_at timestamptz,
  failure_reason text
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', coalesce(new.raw_user_meta_data ->> 'role', 'merchant'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.wallets enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Merchants manage own record" on public.merchants for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own wallets" on public.wallets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Merchants read own invoices" on public.invoices for select to authenticated using (merchant_id in (select id from public.merchants where user_id = (select auth.uid())));
create policy "Merchants read own payments" on public.payments for select to authenticated using (invoice_reference in (select i.reference from public.invoices i join public.merchants m on m.id = i.merchant_id where m.user_id = (select auth.uid())));
create policy "Merchants read own payouts" on public.payouts for select to authenticated using (payment_id in (select p.id from public.payments p join public.invoices i on i.reference = p.invoice_reference join public.merchants m on m.id = i.merchant_id where m.user_id = (select auth.uid())));
