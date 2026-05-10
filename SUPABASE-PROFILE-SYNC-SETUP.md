# Supabase Profile Sync Setup

Huong dan nay dung cho pham vi sync v1 cua Zenvy Browser:

- Sync thong tin ho so: id, name, group, notes, proxy, fingerprint, variables.
- Sync cookie cua tung ho so.
- Khong sync history, cache, downloaded files, extension data, full Chrome user data folder.

Muc tieu: user login cung mot tai khoan tren Windows/Mac se thay cung danh sach ho so va cookie da luu.

## 1. Tao Supabase Project

1. Vao https://supabase.com.
2. Dang nhap hoac tao account.
3. Click `New Project`.
4. Chon organization.
5. Dat project name, vi du `zenvy-browser`.
6. Chon region gan user nhat, vi du Singapore neu user o Viet Nam/SEA.
7. Chon Free plan cho giai doan development.
8. Luu database password o noi rieng, khong commit vao Git.

## 2. Lay API Config

Trong Supabase dashboard:

1. Vao `Project Settings`.
2. Vao `API`.
3. Copy `Project URL`.
4. Copy `anon public` key.
5. Khong copy `service_role` key vao app Electron.

Cap nhat file `.env` local:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

Luu y:

- `.env` chi de local.
- Khong push key that len GitHub.
- Neu `.env` da tung bi push, hay rotate key trong Supabase.

## 3. Cau Hinh Auth

Trong dashboard:

1. Vao `Authentication`.
2. Vao `Providers`.
3. Bat provider `Email`.
4. Trong development, co the tat `Confirm email` de test nhanh.
5. Khi release that, nen bat lai email confirmation.

Neu can redirect URL:

1. Vao `Authentication` -> `URL Configuration`.
2. Them site URL/local URL neu app dung deep link hoac callback.
3. App hien tai dang sign in bang email/password nen chua bat buoc callback URL.

## 4. Chay SQL Schema

Vao `SQL Editor` trong Supabase, tao query moi va chay SQL duoi day.

Schema nay uu tien sync profile + group + cookie nhe. Cookie duoc tach bang rieng de sau nay co the ma hoa/nen va limit dung luong de hon.

```sql
create extension if not exists "uuid-ossp";

create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  group_id uuid references public.groups(id) on delete set null,
  notes text not null default '',
  proxy jsonb not null default '{"type":"none","host":"","port":"","username":"","password":""}'::jsonb,
  fingerprint jsonb not null default '{}'::jsonb,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'closed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profile_cookies (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cookies jsonb not null default '[]'::jsonb,
  cookie_count integer not null default 0,
  byte_size integer not null default 0,
  encrypted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_groups_user_id on public.groups(user_id);
create index if not exists idx_groups_updated_at on public.groups(updated_at);
create index if not exists idx_groups_deleted_at on public.groups(deleted_at) where deleted_at is null;

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_group_id on public.profiles(group_id);
create index if not exists idx_profiles_updated_at on public.profiles(updated_at);
create index if not exists idx_profiles_deleted_at on public.profiles(deleted_at) where deleted_at is null;

create index if not exists idx_profile_cookies_user_id on public.profile_cookies(user_id);
create index if not exists idx_profile_cookies_updated_at on public.profile_cookies(updated_at);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_groups_updated_at on public.groups;
create trigger update_groups_updated_at
before update on public.groups
for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists update_profile_cookies_updated_at on public.profile_cookies;
create trigger update_profile_cookies_updated_at
before update on public.profile_cookies
for each row execute function public.update_updated_at_column();
```

## 5. Bat Row Level Security

Chay tiep SQL nay trong `SQL Editor`.

RLS dam bao user chi doc/ghi du lieu cua chinh tai khoan do. App Electron chi duoc dung anon key, nen RLS la lop bao ve bat buoc.

```sql
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_cookies enable row level security;

drop policy if exists "groups_select_own" on public.groups;
create policy "groups_select_own"
on public.groups for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "groups_insert_own" on public.groups;
create policy "groups_insert_own"
on public.groups for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "groups_update_own" on public.groups;
create policy "groups_update_own"
on public.groups for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "groups_delete_own" on public.groups;
create policy "groups_delete_own"
on public.groups for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile_cookies_select_own" on public.profile_cookies;
create policy "profile_cookies_select_own"
on public.profile_cookies for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile_cookies_insert_own" on public.profile_cookies;
create policy "profile_cookies_insert_own"
on public.profile_cookies for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "profile_cookies_update_own" on public.profile_cookies;
create policy "profile_cookies_update_own"
on public.profile_cookies for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "profile_cookies_delete_own" on public.profile_cookies;
create policy "profile_cookies_delete_own"
on public.profile_cookies for delete
to authenticated
using (auth.uid() = user_id);
```

## 6. Kiem Tra Bang Trong Dashboard

Sau khi chay SQL:

1. Vao `Table Editor`.
2. Kiem tra co 3 bang:
   - `groups`
   - `profiles`
   - `profile_cookies`
3. Mo tung bang va kiem tra RLS dang enabled.
4. Khong insert data thu cong bang dashboard neu khong co `user_id` hop le.

## 7. Quyen Va Bao Mat Cookie

Cookie la du lieu nhay cam. V1 co the luu JSONB de dev nhanh, nhung ban release nen ma hoa truoc khi upload.

Khuyen nghi:

- Khong dung `service_role` trong app.
- Chi dung `anon public` key.
- Bat RLS tren tat ca bang user data.
- Proxy password va cookie nen duoc ma hoa client-side truoc khi luu cloud.
- Khong log cookie ra console.
- Khong dua cookie vao crash report/log file.

Neu chua lam ma hoa ngay, toi thieu can:

- Gioi han cookie sync cho profile owner.
- Khong hien raw cookie trong UI neu khong can.
- Co nut `Clear cloud cookies` cho tung profile.

## 8. Luong Sync V1 Nen Implement

Khi login:

1. Lay current user tu Supabase Auth.
2. Pull `groups` theo `user_id`.
3. Pull `profiles` theo `user_id`, bo qua row co `deleted_at`.
4. Pull `profile_cookies` theo `user_id`.
5. Merge ve local cache.

Khi tao profile:

1. Tao UUID local.
2. Ghi local cache.
3. Upsert vao `profiles`.
4. Neu co cookie, upsert vao `profile_cookies`.

Khi sua profile:

1. Update local.
2. Upsert cloud.
3. Dung `updated_at` de may khac biet ban moi hon.

Khi xoa profile:

1. Khong can hard delete ngay.
2. Set `deleted_at = now()` tren cloud.
3. Local an profile do.
4. Sau nay co the cleanup hard delete theo lich.

Khi mo profile:

1. Load profile config tu local.
2. Load cookie tu local/cloud.
3. Restore cookie vao browser context truoc khi user vao website.

Khi dong profile:

1. Lay cookie moi tu browser.
2. Ghi local.
3. Upsert `profile_cookies`.
4. Cap nhat `profiles.updated_at` neu can.

## 9. Gioi Han Free-Friendly

Pham vi nay nhe vi khong sync cache/history/full browser folder.

De tranh vuot free tier:

- Dat soft limit cookie bundle, vi du 5 MB/profile.
- Dat hard limit, vi du 20 MB/profile.
- Neu vuot limit, bao user clear cookie hoac tat cloud cookie sync cho profile do.
- Khong auto sync tat ca profile moi vai giay.
- Sync khi login, khi save profile, khi close profile, va khi user bam `Sync now`.

## 10. Test Checklist

- [ ] Tao Supabase project.
- [ ] Lay `SUPABASE_URL`.
- [ ] Lay `SUPABASE_ANON_KEY`.
- [ ] Dien `.env` local.
- [ ] Chay SQL schema thanh cong.
- [ ] Bat RLS cho `groups`, `profiles`, `profile_cookies`.
- [ ] Tao user A trong app.
- [ ] Tao profile tren May A.
- [ ] Profile xuat hien trong `profiles` tren Supabase.
- [ ] Cookie xuat hien trong `profile_cookies` sau khi dong profile.
- [ ] Login cung user tren May B.
- [ ] May B thay dung group/profile/notes/proxy/fingerprint.
- [ ] May B restore cookie khi mo profile.
- [ ] User B khac khong doc duoc profile cua user A.
- [ ] Xoa profile tren May A, May B khong con thay sau sync.

## 11. Troubleshooting

### Loi `Supabase not configured`

Kiem tra `.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

Restart app sau khi sua `.env`.

### Loi `new row violates row-level security policy`

Nguyen nhan thuong gap:

- Chua login.
- Insert thieu `user_id`.
- `user_id` khong bang `auth.uid()`.
- Dung sai key hoac session het han.

### Profile khong hien tren may khac

Kiem tra:

- May A da push cloud chua.
- Row co `deleted_at` khong.
- May B login dung cung email/account khong.
- `profiles.user_id` co bang user id hien tai khong.

### Cookie khong restore login

Cookie co the khong du cho mot so website.

Kiem tra:

- Cookie domain/path co dung khong.
- Cookie con han khong.
- Profile fingerprint/proxy/user-agent co on dinh khong.
- Website co yeu cau LocalStorage/IndexedDB khong.

V1 chi sync cookie, nen mot so site van co the bat login/checkpoint lai.

## 12. Ghi Chu Cho Code Sau Nay

Repo hien tai da co:

- Supabase Auth trong `src/main/auth.ts`.
- Supabase client trong `src/main/supabase.ts`.
- Local profile DB trong `src/main/db.ts`.
- Cookie local trong `src/main/cookies.ts`.

Phan can code tiep:

- Tao cloud repository cho `profiles`, `groups`, `profile_cookies`.
- Tao sync service noi local DB voi Supabase.
- Doi IPC profile sang di qua sync-aware repository.
- Them nut/trang thai `Sync now`, `Last synced`, `Sync failed`.
