create extension if not exists vector with schema extensions;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_auth_user_created();

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  business_type text not null default '',
  description text not null default '',
  languages text[] not null default array['English']::text[],
  contact text not null default '',
  working_hours text not null default '',
  automation_mode text not null default 'draft_only' check (automation_mode in ('draft_only','safe_automation','ai_active')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id)
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(), unique (workspace_id,user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id,workspace_id);

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.role() = 'service_role', false) or exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.create_workspace(p_name text,p_business_type text,p_description text,p_languages text[],p_contact text,p_working_hours text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.workspaces(name,business_type,description,languages,contact,working_hours,automation_mode)
  values (p_name,p_business_type,coalesce(p_description,''),coalesce(p_languages,array['English']::text[]),coalesce(p_contact,''),coalesce(p_working_hours,''),'draft_only') returning id into new_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(new_id,auth.uid(),'owner');
  return new_id;
end;
$$;
revoke all on function public.create_workspace(text,text,text,text[],text,text) from public,anon;
grant execute on function public.create_workspace(text,text,text,text[],text,text) to authenticated;
revoke all on function public.is_workspace_member(uuid) from public,anon;
grant execute on function public.is_workspace_member(uuid) to authenticated,service_role;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, file_type text not null default 'TEXT',
  status text not null default 'pending_review' check (status in ('processing','pending_review','approved','rejected','error')),
  extracted_text text not null default '', suggested_facts jsonb not null default '[]'::jsonb,
  suggested_products jsonb not null default '[]'::jsonb, suggested_faqs jsonb not null default '[]'::jsonb,
  suggested_policies jsonb not null default '[]'::jsonb, storage_path text, error_message text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create index if not exists knowledge_sources_workspace_status_idx on public.knowledge_sources(workspace_id,status,updated_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null, content text not null,
  embedding extensions.vector(1536), approved boolean not null default false,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
  foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade
);
create index if not exists knowledge_chunks_workspace_approved_idx on public.knowledge_chunks(workspace_id,approved);
create index if not exists knowledge_chunks_embedding_idx on public.knowledge_chunks using hnsw(embedding extensions.vector_cosine_ops) where approved;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, category text not null default '', description text not null default '', price numeric(14,2),
  currency char(3) not null default 'INR', price_qualifier text not null default '', availability text not null default '',
  inclusions jsonb not null default '[]'::jsonb, delivery_time text not null default '',
  status text not null default 'draft' check(status in ('draft','approved','archived')),
  source_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.products add constraint products_source_same_workspace_fk
  foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade;
create index if not exists products_workspace_status_idx on public.products(workspace_id,status,updated_at desc);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  question text not null, answer text not null, status text not null default 'draft' check(status in ('draft','approved','archived')),
  source_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,question),
  foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade
);
create table if not exists public.policies (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, content text not null, status text not null default 'draft' check(status in ('draft','approved','archived')),
  source_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,name),
  foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  phone text not null, display_name text not null default 'Customer', last_seen_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,phone)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null, customer_name text not null default 'Customer', customer_phone text not null default '',
  channel text not null default 'whatsapp' check(channel in ('whatsapp','web_demo')),
  status text not null default 'ai_active' check(status in ('ai_active','awaiting_approval','escalated','human_active','resolved')),
  unread integer not null default 0 check(unread >= 0), resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,workspace_id)
);
create index if not exists conversations_workspace_updated_idx on public.conversations(workspace_id,updated_at desc);
create index if not exists conversations_contact_idx on public.conversations(workspace_id,contact_id,updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null,
  direction text not null check(direction in ('incoming','outgoing')), sender text not null check(sender in ('customer','ai','owner')),
  body text not null, delivery_status text not null default 'received' check(delivery_status in ('received','sent','delivered','read','draft','failed')),
  media_type text, citations jsonb not null default '[]'::jsonb, language text not null default 'en' check(language in ('en','hi','hinglish')),
  external_id text, provider_response jsonb, created_at timestamptz not null default now(),
  unique(id,workspace_id), foreign key(conversation_id,workspace_id) references public.conversations(id,workspace_id) on delete cascade
);
create unique index if not exists messages_external_id_unique_idx on public.messages(external_id) where external_id is not null;
create index if not exists messages_conversation_created_idx on public.messages(workspace_id,conversation_id,created_at);

create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  phone_number_id text not null unique, business_account_id text not null, display_phone text not null,
  encrypted_access_token text not null, status text not null default 'connected' check(status in ('connected','disconnected','error')),
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table if not exists public.escalations (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null, message_id uuid,
  reason text not null, status text not null default 'open' check(status in ('open','assigned','resolved')),
  created_at timestamptz not null default now(), resolved_at timestamptz,
  foreign key(conversation_id,workspace_id) references public.conversations(id,workspace_id) on delete cascade,
  foreign key(message_id,workspace_id) references public.messages(id,workspace_id) on delete cascade
);
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid, message_id uuid, intent text not null, confidence numeric(4,3) not null default 0,
  citations jsonb not null default '[]'::jsonb, decision text not null, reason text, created_at timestamptz not null default now()
);
create table if not exists public.unresolved_questions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid, message_id uuid, question text not null, intent text not null default 'business_question',
  status text not null default 'open' check(status in ('open','proposed','resolved','dismissed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.rate_limit_buckets (key_hash text primary key, hit_count integer not null, reset_at timestamptz not null);
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon,authenticated;
grant all on public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(p_key_hash text,p_limit integer,p_window_ms integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare allowed boolean;
begin
  insert into public.rate_limit_buckets as bucket(key_hash,hit_count,reset_at)
  values(p_key_hash,1,now()+make_interval(secs=>p_window_ms::double precision/1000.0))
  on conflict(key_hash) do update set
    hit_count=case when bucket.reset_at<=now() then 1 else bucket.hit_count+1 end,
    reset_at=case when bucket.reset_at<=now() then now()+make_interval(secs=>p_window_ms::double precision/1000.0) else bucket.reset_at end
  returning hit_count<=p_limit into allowed;
  return coalesce(allowed,false);
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create or replace function public.search_approved_knowledge(p_workspace_id uuid,p_query_embedding extensions.vector(1536),p_match_count integer default 5)
returns table(id uuid,workspace_id uuid,source_id uuid,content text,updated_at timestamptz,similarity double precision)
language sql stable set search_path=public,extensions as $$
  select chunks.id,chunks.workspace_id,chunks.source_id,chunks.content,chunks.updated_at,1-(chunks.embedding<=>p_query_embedding) as similarity
  from public.knowledge_chunks chunks
  where chunks.workspace_id=p_workspace_id and chunks.approved and chunks.embedding is not null and public.is_workspace_member(p_workspace_id)
  order by chunks.embedding<=>p_query_embedding limit greatest(1,least(p_match_count,10));
$$;
revoke all on function public.search_approved_knowledge(uuid,extensions.vector,integer) from public,anon;
grant execute on function public.search_approved_knowledge(uuid,extensions.vector,integer) to authenticated,service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end;
$$;

alter table public.users enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.products enable row level security;
alter table public.faqs enable row level security;
alter table public.policies enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.whatsapp_connections enable row level security;
alter table public.escalations enable row level security;
alter table public.agent_actions enable row level security;
alter table public.unresolved_questions enable row level security;

create policy users_self on public.users for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy workspaces_member on public.workspaces for all to authenticated using(public.is_workspace_member(id)) with check(public.is_workspace_member(id));
create policy workspace_members_member_read on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
do $$
declare table_name text;
begin
  foreach table_name in array array['knowledge_sources','knowledge_chunks','products','faqs','policies','contacts','conversations','messages','escalations','agent_actions','unresolved_questions'] loop
    execute format('create policy %I on public.%I for all to authenticated using(public.is_workspace_member(workspace_id)) with check(public.is_workspace_member(workspace_id))',table_name||'_workspace_member',table_name);
  end loop;
end;
$$;
create policy whatsapp_connection_member_read on public.whatsapp_connections for select to authenticated using(public.is_workspace_member(workspace_id));

revoke all on public.users,public.workspaces,public.workspace_members,public.knowledge_sources,public.knowledge_chunks,public.products,public.faqs,public.policies,public.contacts,public.conversations,public.messages,public.whatsapp_connections,public.escalations,public.agent_actions,public.unresolved_questions from anon;
grant select,insert,update,delete on public.users,public.workspaces,public.workspace_members,public.knowledge_sources,public.knowledge_chunks,public.products,public.faqs,public.policies,public.contacts,public.conversations,public.messages,public.escalations,public.agent_actions,public.unresolved_questions to authenticated;
revoke all on public.whatsapp_connections from anon,authenticated;
grant select(workspace_id,phone_number_id,business_account_id,display_phone,status,updated_at,created_at) on public.whatsapp_connections to authenticated;
grant all on public.whatsapp_connections to service_role;
grant all on public.users,public.workspaces,public.workspace_members,public.knowledge_sources,public.knowledge_chunks,public.products,public.faqs,public.policies,public.contacts,public.conversations,public.messages,public.escalations,public.agent_actions,public.unresolved_questions to service_role;

do $$
declare table_name text;
begin
  foreach table_name in array array['users','workspaces','knowledge_sources','knowledge_chunks','products','faqs','policies','contacts','conversations','whatsapp_connections','unresolved_questions'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',table_name);
  end loop;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('knowledge-source-files','knowledge-source-files',false,15728640,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists knowledge_files_member_read on storage.objects;
create policy knowledge_files_member_read on storage.objects for select to authenticated using(bucket_id='knowledge-source-files' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
drop policy if exists knowledge_files_member_insert on storage.objects;
create policy knowledge_files_member_insert on storage.objects for insert to authenticated with check(bucket_id='knowledge-source-files' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
drop policy if exists knowledge_files_member_delete on storage.objects;
create policy knowledge_files_member_delete on storage.objects for delete to authenticated using(bucket_id='knowledge-source-files' and public.is_workspace_member((storage.foldername(name))[1]::uuid));

insert into public.workspaces(id,name,business_type,description,languages,contact,working_hours,automation_mode)
values('00000000-0000-4000-8000-00000000d001','Olive & Oak Studio','Wedding photography','A sample photography studio workspace.',array['English','Hindi','Hinglish'],'+91 98765 43210','Tuesday–Sunday, 10:00 AM–6:00 PM IST · Monday closed','safe_automation')
on conflict(id) do nothing;

insert into public.knowledge_sources(id,workspace_id,name,file_type,status,extracted_text,suggested_facts)
values
('00000000-0000-4000-8000-00000000d101','00000000-0000-4000-8000-00000000d001','Wedding packages & pricing.pdf','PDF','approved','Wedding Photography Silver — ₹45,000. Wedding Photography Gold — ₹75,000. Gold includes two photographers, one videographer, edited photographs and one album. Wedding Photography Premium — ₹1,20,000. Gold delivery time: 6–8 weeks. Booking advance: 30%.','["Silver: ₹45,000","Gold: ₹75,000","Premium: ₹1,20,000","Gold includes two photographers, one videographer, edited photographs and one album","Gold delivery: 6–8 weeks","30% advance required"]'::jsonb),
('00000000-0000-4000-8000-00000000d102','00000000-0000-4000-8000-00000000d001','Booking & cancellation policy.txt','TXT','approved','A 30% advance is required to confirm a booking. Cancellations and refund terms are reviewed against the signed client agreement; ask the studio team to confirm the applicable terms.','["A 30% advance is required to confirm a booking","Cancellation and refund terms are checked against the signed agreement"]'::jsonb),
('00000000-0000-4000-8000-00000000d103','00000000-0000-4000-8000-00000000d001','Frequently asked questions.txt','TXT','approved','The studio is open Tuesday to Sunday, 10 AM to 6 PM IST, and closed Monday. Contact +91 98765 43210. Wedding gallery delivery takes 6–8 weeks.','["Open Tuesday to Sunday, 10 AM to 6 PM IST","Closed Monday","Contact +91 98765 43210","Delivery: 6–8 weeks"]'::jsonb)
on conflict(id) do nothing;

insert into public.products(id,workspace_id,name,category,description,price,currency,availability,inclusions,delivery_time,status,source_id)
values
('00000000-0000-4000-8000-00000000d201','00000000-0000-4000-8000-00000000d001','Wedding Photography Silver','Wedding photography','',45000,'INR','','[]'::jsonb,'','approved','00000000-0000-4000-8000-00000000d101'),
('00000000-0000-4000-8000-00000000d202','00000000-0000-4000-8000-00000000d001','Wedding Photography Gold','Wedding photography','',75000,'INR','','["Two photographers","One videographer","Edited photographs","One album"]'::jsonb,'6–8 weeks','approved','00000000-0000-4000-8000-00000000d101'),
('00000000-0000-4000-8000-00000000d203','00000000-0000-4000-8000-00000000d001','Wedding Photography Premium','Wedding photography','',120000,'INR','','[]'::jsonb,'','approved','00000000-0000-4000-8000-00000000d101')
on conflict(id) do nothing;

insert into public.knowledge_chunks(id,workspace_id,source_id,content,approved)
values
('00000000-0000-4000-8000-00000000d301','00000000-0000-4000-8000-00000000d001','00000000-0000-4000-8000-00000000d101','Wedding Photography Silver costs ₹45,000. Wedding Photography Gold costs ₹75,000 and includes two photographers, one videographer, edited photographs and one album. Wedding Photography Premium costs ₹1,20,000. Wedding Photography Gold delivery takes 6–8 weeks. A 30% advance is required to confirm a booking.',true),
('00000000-0000-4000-8000-00000000d302','00000000-0000-4000-8000-00000000d001','00000000-0000-4000-8000-00000000d102','A 30% advance is required to confirm a booking. Cancellations and refund terms are reviewed against the signed client agreement; ask the studio team to confirm the applicable terms.',true),
('00000000-0000-4000-8000-00000000d303','00000000-0000-4000-8000-00000000d001','00000000-0000-4000-8000-00000000d103','The studio is open Tuesday to Sunday, 10 AM to 6 PM IST, and closed Monday. Contact +91 98765 43210. Wedding gallery delivery takes 6–8 weeks.',true)
on conflict(id) do nothing;

insert into public.faqs(id,workspace_id,question,answer,status,source_id)
values
('00000000-0000-4000-8000-00000000d401','00000000-0000-4000-8000-00000000d001','How long does Gold package delivery take?','Wedding Photography Gold delivery takes 6–8 weeks.','approved','00000000-0000-4000-8000-00000000d101'),
('00000000-0000-4000-8000-00000000d402','00000000-0000-4000-8000-00000000d001','What advance is required?','A 30% advance is required to confirm a booking.','approved','00000000-0000-4000-8000-00000000d102'),
('00000000-0000-4000-8000-00000000d403','00000000-0000-4000-8000-00000000d001','When is the studio closed?','The studio is closed on Monday.','approved','00000000-0000-4000-8000-00000000d103')
on conflict(id) do nothing;

insert into public.policies(id,workspace_id,name,content,status,source_id)
values('00000000-0000-4000-8000-00000000d501','00000000-0000-4000-8000-00000000d001','Cancellation and refunds','Cancellations and refund terms are reviewed against the signed client agreement. Cancellation and refund requests must be handed to the studio team.','approved','00000000-0000-4000-8000-00000000d102')
on conflict(id) do nothing;
