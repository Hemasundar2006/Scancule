-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('admin', 'shop_owner')) not null default 'shop_owner',
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- 2. SHOPS TABLE
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  shop_name text not null,
  category text,
  address text,
  contact_number text,
  logo_url text,
  google_sheet_id text,          -- connected Google Sheet ID
  google_refresh_token text,     -- OAuth2 Refresh Token
  status text check (status in ('active', 'suspended')) default 'active',
  created_at timestamptz default now()
);

-- 3. PLANS TABLE
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  duration_days int not null,
  barcode_limit int not null,
  features jsonb not null default '{}'::jsonb, -- e.g., {"sheet_sync": true, "bulk_export": true}
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. SUBSCRIPTIONS TABLE
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  plan_id uuid references public.plans(id) not null,
  status text check (status in ('pending', 'active', 'rejected', 'expired')) default 'pending',
  payment_proof_url text,       -- URL to payment screenshot
  transaction_ref text,         -- UPI UTR / Reference number
  start_date timestamptz,
  end_date timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 5. PRODUCTS TABLE
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  unique_code text unique not null,   -- used in QR code URL: /p/{unique_code}
  custom_fields jsonb not null default '[]'::jsonb, -- e.g. [{"label": "Price", "value": "299", "visible_to_public": true}]
  barcode_url text,                   -- URL to image in storage
  scan_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. SCAN LOGS TABLE
create table public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  scanned_at timestamptz default now(),
  ip_hash text not null,               -- Privacy-compliant hashed IP address
  city text,
  device_type text
);

-- 7. PAYMENT SETTINGS TABLE
create table public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  upi_id text,
  qr_image_url text,
  bank_details text,
  updated_at timestamptz default now()
);

-- 8. PRODUCT SYNC QUEUE TABLE (For offline/reliable Google Sheets syncing)
create table public.product_sync_queue (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  shop_id uuid not null,
  action_type text check (action_type in ('INSERT', 'UPDATE', 'DELETE')) not null,
  payload jsonb not null,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- =========================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- =========================================================================

-- Admin check helper
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Trigger to automatically create a profile after auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    case
      when new.email = 'admin@barcodesaas.com' then 'admin'
      else 'shop_owner'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to queue Google Sheet sync when a product changes
create or replace function public.queue_product_sync()
returns trigger as $$
begin
  insert into public.product_sync_queue (product_id, shop_id, action_type, payload)
  values (
    coalesce(new.id, old.id),
    coalesce(new.shop_id, old.shop_id),
    tg_op,
    case
      when tg_op = 'DELETE' then jsonb_build_object('id', old.id, 'unique_code', old.unique_code)
      else jsonb_build_object(
        'id', new.id,
        'unique_code', new.unique_code,
        'custom_fields', new.custom_fields,
        'barcode_url', new.barcode_url
      )
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_product_change
  after insert or update or delete on public.products
  for each row execute procedure public.queue_product_sync();


-- =========================================================================
-- SECURITY DEFINER PUBLIC ACCESS FUNCTIONS
-- =========================================================================

-- Function that anonymous users call to fetch product info safely.
-- This filters custom_fields to show ONLY fields marked visible_to_public = true.
create or replace function public.get_public_product(p_unique_code text)
returns table (
  product_id uuid,
  unique_code text,
  barcode_url text,
  shop_id uuid,
  shop_name text,
  shop_category text,
  shop_logo_url text,
  public_fields jsonb,
  created_at timestamptz
) as $$
begin
  return query
  select
    p.id as product_id,
    p.unique_code,
    p.barcode_url,
    s.id as shop_id,
    s.shop_name,
    s.category as shop_category,
    s.logo_url as shop_logo_url,
    (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from jsonb_array_elements(p.custom_fields) elem
      where (elem->>'visible_to_public')::boolean = true
    ) as public_fields,
    p.created_at
  from public.products p
  join public.shops s on p.shop_id = s.id
  where p.unique_code = p_unique_code and s.status = 'active';
end;
$$ language plpgsql security definer;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Profiles are readable by owner or admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Profiles are updatable by owner or admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- Shops
alter table public.shops enable row level security;

create policy "Shops are readable by owner or admin"
  on public.shops for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "Shops can be created by authenticated users"
  on public.shops for insert
  with check (owner_id = auth.uid() or public.is_admin());

create policy "Shops are updatable by owner or admin"
  on public.shops for update
  using (owner_id = auth.uid() or public.is_admin());

-- Plans
alter table public.plans enable row level security;

create policy "Plans are viewable by everyone"
  on public.plans for select
  using (is_active = true or public.is_admin());

create policy "Plans are manageable by admin only"
  on public.plans for all
  using (public.is_admin());

-- Subscriptions
alter table public.subscriptions enable row level security;

create policy "Subscriptions are readable by shop owner or admin"
  on public.subscriptions for select
  using (
    exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = auth.uid() or public.is_admin()))
  );

create policy "Subscriptions can be requested by shop owner"
  on public.subscriptions for insert
  with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "Subscriptions are manageable by admin only"
  on public.subscriptions for all
  using (public.is_admin());

-- Products
alter table public.products enable row level security;

create policy "Products are manageable by shop owner or admin"
  on public.products for all
  using (
    exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = auth.uid() or public.is_admin()))
  );

-- Scan Logs
alter table public.scan_logs enable row level security;

create policy "Scan logs are readable by shop owner or admin"
  on public.scan_logs for select
  using (
    exists (
      select 1 from public.products p
      join public.shops s on p.shop_id = s.id
      where p.id = product_id and (s.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Payment Settings
alter table public.payment_settings enable row level security;

create policy "Payment settings are readable by everyone"
  on public.payment_settings for select
  using (true);

create policy "Payment settings are manageable by admin only"
  on public.payment_settings for all
  using (public.is_admin());

-- Product Sync Queue
alter table public.product_sync_queue enable row level security;

create policy "Product sync queue is readable by shop owner or admin"
  on public.product_sync_queue for select
  using (
    exists (select 1 from public.shops s where s.id = shop_id and (s.owner_id = auth.uid() or public.is_admin()))
  );


-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Insert pricing plans
insert into public.plans (name, price, duration_days, barcode_limit, features) values
('Free Trial', 0, 7, 10, '{"sheet_sync": false, "bulk_export": false}'::jsonb),
('Basic', 299, 30, 200, '{"sheet_sync": true, "bulk_export": false}'::jsonb),
('Pro', 799, 30, 2000, '{"sheet_sync": true, "bulk_export": true}'::jsonb),
('Enterprise', 9999, 365, 999999, '{"sheet_sync": true, "bulk_export": true, "multi_shop": true}'::jsonb);

-- Insert placeholder payment settings
insert into public.payment_settings (upi_id, qr_image_url, bank_details) values
('admin@upi', 'https://placehold.co/400x400/png?text=UPI+QR+Code', 'Bank Name: State Bank of India\nAccount No: 12345678901\nIFSC: SBIN0001234\nHolder: Vivora Admin');
