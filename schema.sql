-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 invite_code text not null unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.memberships (
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'player' check(role in ('dm','player')),
 display_name text not null default 'Adventurer',
 joined_at timestamptz not null default now(),
 primary key(campaign_id,user_id)
);
create table if not exists public.channels (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 name text not null,
 created_at timestamptz not null default now(),
 unique(campaign_id,name)
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 channel_id uuid not null references public.channels(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null default '',
 image_url text,
 created_at timestamptz not null default now()
);
create table if not exists public.characters (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 ancestry text not null default 'Human',
 class_name text not null default 'Fighter',
 level int not null default 1 check(level between 1 and 20),
 hp int not null default 10,
 ac int not null default 10,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists messages_channel_created_idx on public.messages(channel_id,created_at);
create index if not exists characters_campaign_idx on public.characters(campaign_id);

create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships where campaign_id=cid and user_id=auth.uid()) $$;
create or replace function public.is_campaign_dm(cid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships where campaign_id=cid and user_id=auth.uid() and role='dm') $$;

create or replace function public.create_campaign(campaign_name text, member_name text)
returns json language plpgsql security definer set search_path=public
as $$
declare c public.campaigns;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.campaigns(name,created_by) values (campaign_name,auth.uid()) returning * into c;
 insert into public.memberships(campaign_id,user_id,role,display_name) values(c.id,auth.uid(),'dm',member_name);
 insert into public.channels(campaign_id,name) values(c.id,'general'),(c.id,'roleplay'),(c.id,'dice-rolls'),(c.id,'party-loot');
 return json_build_object('id',c.id,'name',c.name,'invite_code',c.invite_code);
end $$;
create or replace function public.join_campaign(code text, member_name text)
returns json language plpgsql security definer set search_path=public
as $$
declare c public.campaigns;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into c from public.campaigns where invite_code=upper(trim(code));
 if c.id is null then raise exception 'Invite code not found'; end if;
 insert into public.memberships(campaign_id,user_id,role,display_name) values(c.id,auth.uid(),'player',member_name)
 on conflict(campaign_id,user_id) do update set display_name=excluded.display_name;
 return json_build_object('id',c.id,'name',c.name,'invite_code',c.invite_code);
end $$;
grant execute on function public.create_campaign(text,text) to authenticated;
grant execute on function public.join_campaign(text,text) to authenticated;

alter table public.campaigns enable row level security;
alter table public.memberships enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.characters enable row level security;

create policy "campaign members can view campaigns" on public.campaigns for select to authenticated using(public.is_campaign_member(id));
create policy "members can view membership" on public.memberships for select to authenticated using(public.is_campaign_member(campaign_id));
create policy "DM manages membership" on public.memberships for update to authenticated using(public.is_campaign_dm(campaign_id)) with check(public.is_campaign_dm(campaign_id));
create policy "members view channels" on public.channels for select to authenticated using(public.is_campaign_member(campaign_id));
create policy "members read messages" on public.messages for select to authenticated using(public.is_campaign_member(campaign_id));
create policy "members post messages" on public.messages for insert to authenticated with check(user_id=auth.uid() and public.is_campaign_member(campaign_id) and exists(select 1 from public.channels c where c.id=channel_id and c.campaign_id=campaign_id));
create policy "members view characters" on public.characters for select to authenticated using(public.is_campaign_member(campaign_id));
create policy "owners create characters" on public.characters for insert to authenticated with check(owner_id=auth.uid() and public.is_campaign_member(campaign_id));
create policy "owners or DM update characters" on public.characters for update to authenticated using(owner_id=auth.uid() or public.is_campaign_dm(campaign_id)) with check(owner_id=auth.uid() or public.is_campaign_dm(campaign_id));
create policy "owners or DM delete characters" on public.characters for delete to authenticated using(owner_id=auth.uid() or public.is_campaign_dm(campaign_id));

-- Enable realtime for chat messages.
alter publication supabase_realtime add table public.messages;

-- Image bucket. Public URLs are convenient for campaign sharing; uploads are restricted to campaign members.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campaign-images','campaign-images',true,10485760,array['image/png','image/jpeg','image/gif','image/webp'])
on conflict(id) do nothing;
create policy "campaign members upload images" on storage.objects for insert to authenticated
with check(bucket_id='campaign-images' and public.is_campaign_member(((storage.foldername(name))[1])::uuid));
create policy "campaign members view campaign images" on storage.objects for select to authenticated
using(bucket_id='campaign-images' and public.is_campaign_member(((storage.foldername(name))[1])::uuid));
