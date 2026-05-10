# UI LOADING FIX - 2026-05-08

## Vấn đề
App mở lên không load được UI, chỉ có màn hình nền đen. App bị kẹt ở màn hình loading.

## Nguyên nhân
1. **Auth initialization bị hang**: Function `getCurrentUser()` trong `src/main/auth.ts` gọi `restoreSession()` để kết nối với Supabase, nhưng không có timeout. Nếu Supabase không phản hồi hoặc mạng chậm, app sẽ bị hang mãi mãi.

2. **Cloud sync bị hang**: Function `syncGroupsAndProfiles()` trong `src/main/cloudSync.ts` cũng không có timeout khi pull/push data từ Supabase.

3. **Loading state không bao giờ kết thúc**: Trong `App.tsx`, state `authLoading` được set thành `true` khi khởi động, nhưng nếu auth bị hang, nó sẽ không bao giờ chuyển thành `false`, khiến UI bị kẹt ở màn hình loading.

## Giải pháp

### 1. Thêm timeout cho auth functions (`src/main/auth.ts`)

#### `restoreSession()`
- Thêm timeout 5 giây cho việc restore session
- Nếu timeout, clear session và return null
- Log rõ ràng khi Supabase không được cấu hình

```typescript
// Add timeout to prevent hanging
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('Session restore timeout')), 5000)
})

const sessionPromise = supabase.auth.setSession({...})
const { data, error } = await Promise.race([sessionPromise, timeoutPromise])
```

#### `getCurrentUser()`
- Thêm timeout 3 giây cho việc get current session
- Wrap trong try-catch để handle errors gracefully
- Return null nếu có lỗi thay vì throw

```typescript
try {
  const session = await restoreSession()
  if (session) return session.user

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 3000)
  })
  
  const currentSession = await Promise.race([getCurrentSession(), timeoutPromise])
  return currentSession?.user || null
} catch (err) {
  console.error('[Auth] Error getting current user:', err)
  return null
}
```

### 2. Thêm timeout cho cloud sync (`src/main/cloudSync.ts`)

#### `syncGroupsAndProfiles()`
- Thêm timeout 8 giây cho toàn bộ quá trình sync
- Wrap trong try-catch để không throw error ra ngoài
- Log rõ ràng khi không có user ID (chưa đăng nhập)
- Allow app tiếp tục với local data nếu sync fail

```typescript
try {
  const userId = await getUserId()
  if (!userId) {
    console.log('[CloudSync] No user ID, skipping sync')
    return
  }

  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Cloud sync timeout')), 8000)
  })

  const syncPromise = (async () => {
    // ... sync logic
  })()

  await Promise.race([syncPromise, timeoutPromise])
} catch (err) {
  console.warn('[CloudSync] Sync failed:', err)
  // Don't throw - allow app to continue with local data
}
```

## Kết quả

✅ App bây giờ sẽ:
1. Load UI trong vòng tối đa 8 giây (5s auth + 3s fallback)
2. Không bị hang nếu Supabase không phản hồi
3. Tiếp tục hoạt động với local data nếu cloud sync fail
4. Hiển thị login page nếu chưa đăng nhập
5. Hiển thị main app nếu đã đăng nhập

✅ Logs rõ ràng hơn:
- `[Auth] Supabase not configured, skipping session restore`
- `[Auth] Session restored successfully`
- `[Auth] Session restore timeout`
- `[CloudSync] No user ID, skipping sync`
- `[CloudSync] Sync completed successfully`
- `[CloudSync] Sync failed: ...`

## Testing

Để test app:
```bash
npm start
```

App sẽ:
1. Mở trong vòng vài giây
2. Hiển thị login page nếu chưa đăng nhập
3. Hiển thị profiles page nếu đã đăng nhập
4. Không bị hang ở màn hình loading

## Files đã sửa

1. `src/main/auth.ts` - Thêm timeout cho auth functions
2. `src/main/cloudSync.ts` - Thêm timeout cho sync functions

## Notes

- Timeout values có thể điều chỉnh nếu cần:
  - Auth restore: 5000ms (5 giây)
  - Auth getCurrentSession: 3000ms (3 giây)
  - Cloud sync: 8000ms (8 giây)

- App vẫn hoạt động offline hoàn toàn với local data
- Cloud sync sẽ retry tự động khi có network connection
