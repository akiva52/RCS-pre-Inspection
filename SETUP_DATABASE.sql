-- RCS Pre-Inspection Program — Supabase Schema
-- Run this entire script in your Supabase SQL Editor

-- INSPECTIONS table
create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  facility_name text not null,
  address text,
  inspection_date text,
  report_date text,
  wings jsonb default '[]',
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ISSUES table
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  category text not null,
  wing text,
  floor text,
  space_type text,
  location text,
  issue_type text not null,
  notes text,
  photo_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- CUSTOM ITEMS table (for permanently saved custom dropdowns)
create table if not exists custom_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null, -- 'space_type', 'interior_issue', 'exterior_issue', 'critical_issue', 'paperwork_item'
  value text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (open access for now - single user app)
alter table inspections enable row level security;
alter table issues enable row level security;
alter table custom_items enable row level security;

-- Allow all operations (single user app - no auth needed)
create policy "Allow all" on inspections for all using (true) with check (true);
create policy "Allow all" on issues for all using (true) with check (true);
create policy "Allow all" on custom_items for all using (true) with check (true);

-- Storage bucket for photos
insert into storage.buckets (id, name, public) 
values ('inspection-photos', 'inspection-photos', true)
on conflict do nothing;

create policy "Allow all photos" on storage.objects 
for all using (bucket_id = 'inspection-photos') 
with check (bucket_id = 'inspection-photos');
