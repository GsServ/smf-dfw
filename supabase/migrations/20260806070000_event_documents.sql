-- Rules Abouna posts as a PDF, a photo of a printed page, or a Word document,
-- attached to the event they belong to.
--
-- Readable by anyone, like the rules already on the site — a servant should not
-- need an account to read the rules for a game. The upload screen says so
-- plainly, because the failure mode is somebody attaching a roster with
-- children's names to a bucket the whole internet can read.

create table event_documents (
  id           uuid primary key default gen_random_uuid(),
  -- Matches an `id` in the site's events.json. Not a foreign key: the calendar
  -- stays a flat file so the maintenance story survives.
  event_slug   text not null,
  title        text not null,
  storage_path text not null unique,
  mime_type    text,
  size_bytes   bigint,
  sort_order   integer not null default 0,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index event_documents_by_event on event_documents (event_slug);

alter table event_documents enable row level security;

create policy event_documents_public_read on event_documents
  for select to anon, authenticated using (true);

create policy event_documents_committee_writes on event_documents
  for all to authenticated
  using (auth_is_committee()) with check (auth_is_committee());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents', 'event-documents', true,
  10485760, -- 10 MB: a scanned page or a phone photo, not a video
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy event_docs_public_read on storage.objects
  for select using (bucket_id = 'event-documents');

create policy event_docs_committee_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-documents' and auth_is_committee());

create policy event_docs_committee_update on storage.objects
  for update to authenticated
  using (bucket_id = 'event-documents' and auth_is_committee())
  with check (bucket_id = 'event-documents' and auth_is_committee());

create policy event_docs_committee_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-documents' and auth_is_committee());
