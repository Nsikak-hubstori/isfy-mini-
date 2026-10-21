-- ISFY-mini schema: sales marketplace + CRM for abandoned cart recovery
-- Migration 001. Idempotent where practical (safe to re-run).

create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shopify_domain text unique,
  ecommerce_platform text not null default 'shopify',
  webhook_secret text,
  created_at timestamp default now()
);

create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_email text,
  customer_phone text,
  cart_value numeric(12,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','recovered','lost')),
  abandoned_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text,
  rating numeric(3,2),
  total_recovered numeric(12,2) default 0,
  is_active boolean default true,
  joined_at timestamp default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.abandoned_carts(id) on delete cascade,
  rep_id uuid not null references public.sales_reps(id) on delete cascade,
  assigned_at timestamp default now(),
  status text default 'active'
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.abandoned_carts(id) on delete cascade,
  rep_id uuid references public.sales_reps(id) on delete set null,
  duration_seconds int,
  outcome text,
  notes text,
  recording_url text,
  created_at timestamp default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.abandoned_carts(id) on delete cascade,
  template_name text,
  subject text,
  sent_at timestamp default now(),
  opened boolean default false
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid references public.abandoned_carts(id) on delete cascade,
  rep_id uuid references public.sales_reps(id) on delete set null,
  amount numeric(12,2),
  stripe_payment_id text,
  status text default 'pending',
  created_at timestamp default now()
);

-- Indexes for hot query paths (status filters, per-rep lookups)
create index if not exists idx_carts_status on public.abandoned_carts(status);
create index if not exists idx_carts_store on public.abandoned_carts(store_id);
create index if not exists idx_assign_cart on public.assignments(cart_id);
create index if not exists idx_assign_rep on public.assignments(rep_id);
create index if not exists idx_calls_rep on public.call_logs(rep_id);
create index if not exists idx_calls_cart on public.call_logs(cart_id);
create index if not exists idx_comm_rep on public.commissions(rep_id);

-- Security: RLS enabled with no public policies. The backend uses the
-- service-role key (bypasses RLS); the anon key alone cannot read/write.
alter table public.stores enable row level security;
alter table public.abandoned_carts enable row level security;
alter table public.sales_reps enable row level security;
alter table public.assignments enable row level security;
alter table public.call_logs enable row level security;
alter table public.email_logs enable row level security;
alter table public.commissions enable row level security;

-- ---------- Seed data (fixed UUIDs so it is re-runnable) ----------
insert into public.stores (id, name, shopify_domain, ecommerce_platform, webhook_secret) values
 ('a1000000-0000-0000-0000-000000000001','Glow Theory Skincare','glow-theory.myshopify.com','shopify','whsec_demo_glow'),
 ('a1000000-0000-0000-0000-000000000002','Velvet Lash Co.','velvet-lash.myshopify.com','shopify','whsec_demo_velvet'),
 ('a1000000-0000-0000-0000-000000000003','Pure Bloom Beauty','pure-bloom.myshopify.com','shopify','whsec_demo_bloom')
on conflict (id) do nothing;

insert into public.sales_reps (id, name, email, phone, rating, total_recovered, is_active) values
 ('b2000000-0000-0000-0000-000000000001','Marcus Johnson','marcus.j@example.com','+13055550101',4.80,3250.00,true),
 ('b2000000-0000-0000-0000-000000000002','Sofia Ramirez','sofia.r@example.com','+13055550102',4.90,4120.50,true),
 ('b2000000-0000-0000-0000-000000000003','Tyrell Washington','tyrell.w@example.com','+17865550103',4.50,1890.00,true),
 ('b2000000-0000-0000-0000-000000000004','Emily Carter','emily.c@example.com','+17865550104',4.70,2740.25,true),
 ('b2000000-0000-0000-0000-000000000005','Daniel Nguyen','daniel.n@example.com','+19545550105',4.20,960.00,false)
on conflict (id) do nothing;

insert into public.abandoned_carts (id, store_id, customer_email, customer_phone, cart_value, items, status, abandoned_at) values
 ('c3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','jessica.miller@gmail.com','+12125550111',128.00,'[{"sku":"GT-SERUM-01","name":"Vitamin C Serum","qty":2,"price":64.00}]','new',now()-interval '3 hours'),
 ('c3000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','ashley.brown@yahoo.com','+13105550112',89.50,'[{"sku":"GT-MOIST-02","name":"Hydra Moisturizer","qty":1,"price":89.50}]','new',now()-interval '5 hours'),
 ('c3000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','megan.davis@outlook.com','+17135550113',212.75,'[{"sku":"GT-KIT-05","name":"Glow Starter Kit","qty":1,"price":149.00},{"sku":"GT-MASK-03","name":"Clay Mask","qty":1,"price":63.75}]','contacted',now()-interval '1 day'),
 ('c3000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','brittany.wilson@gmail.com','+16025550114',54.00,'[{"sku":"GT-CLEAN-04","name":"Gentle Cleanser","qty":2,"price":27.00}]','recovered',now()-interval '2 days'),
 ('c3000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','taylor.moore@gmail.com','+14045550115',76.00,'[{"sku":"VL-LASH-10","name":"Silk Lash Set","qty":2,"price":38.00}]','new',now()-interval '2 hours'),
 ('c3000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000002','kayla.thomas@icloud.com','+13055550116',142.30,'[{"sku":"VL-LASH-12","name":"Mega Volume Kit","qty":1,"price":112.30},{"sku":"VL-GLUE-01","name":"Lash Adhesive","qty":1,"price":30.00}]','contacted',now()-interval '20 hours'),
 ('c3000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000002','rachel.anderson@gmail.com','+18175550117',38.00,'[{"sku":"VL-LASH-10","name":"Silk Lash Set","qty":1,"price":38.00}]','lost',now()-interval '6 days'),
 ('c3000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000002','olivia.martin@hotmail.com','+12155550118',165.00,'[{"sku":"VL-KIT-20","name":"Pro Lash Studio Kit","qty":1,"price":165.00}]','new',now()-interval '30 minutes'),
 ('c3000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000003','hannah.lee@gmail.com','+16175550119',97.40,'[{"sku":"PB-SERUM-07","name":"Rose Hip Oil","qty":1,"price":48.70},{"sku":"PB-BALM-02","name":"Lip Balm Trio","qty":2,"price":24.35}]','recovered',now()-interval '3 days'),
 ('c3000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000003','samantha.clark@gmail.com','+14805550120',233.00,'[{"sku":"PB-SET-09","name":"Bloom Gift Set","qty":1,"price":233.00}]','new',now()-interval '8 hours'),
 ('c3000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000003','lauren.young@yahoo.com','+17025550121',61.25,'[{"sku":"PB-MIST-04","name":"Facial Mist","qty":1,"price":61.25}]','contacted',now()-interval '2 days'),
 ('c3000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000003','amber.king@gmail.com','+15035550122',118.60,'[{"sku":"PB-CREAM-03","name":"Night Cream","qty":2,"price":59.30}]','new',now()-interval '1 hour')
on conflict (id) do nothing;

insert into public.assignments (cart_id, rep_id, status)
select v.cart_id::uuid, v.rep_id::uuid, v.st from (values
 ('c3000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000001','active'),
 ('c3000000-0000-0000-0000-000000000004','b2000000-0000-0000-0000-000000000002','completed'),
 ('c3000000-0000-0000-0000-000000000006','b2000000-0000-0000-0000-000000000004','active'),
 ('c3000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000002','completed'),
 ('c3000000-0000-0000-0000-000000000011','b2000000-0000-0000-0000-000000000003','active')
) as v(cart_id, rep_id, st)
where not exists (select 1 from public.assignments);
