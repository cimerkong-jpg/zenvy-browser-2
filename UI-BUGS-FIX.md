# UI BUGS FIX - 2026-05-08

## Các bug đã fix

### 1. ✅ Bug đếm nhóm hồ sơ sai
**Vấn đề:** Hiển thị "5 nhóm hồ sơ" trong khi chỉ có 3 nhóm thực tế (đang tính cả "Tất cả" + "Không có nhóm")

**Nguyên nhân:** Code đang tính `groups.length + 2` 

**Fix:** Đổi thành `groups.length` để chỉ đếm các nhóm thực tế

**File:** `src/renderer/src/pages/ProfilesPage.tsx`
```typescript
// Before:
<p className="mt-1 text-xs text-slate-500">{groups.length + 2} nhóm</p>

// After:
<p className="mt-1 text-xs text-slate-500">{groups.length} nhóm</p>
```

---

### 2. ✅ Bug hiển thị ID dạng UUID
**Vấn đề:** ID hồ sơ hiển thị UUID dài (3d4110d3-fcc6-7349-72dc-04e8de3ddb02) thay vì số ngắn gọn (1001, 1002, ...)

**Nguyên nhân:** App đang dùng UUID làm ID thay vì số tuần tự

**Fix:** Tạo utility function `getDisplayId()` để convert UUID thành số từ 1001-9999:
- Hash UUID thành số nguyên
- Map vào range 1001-9999
- Mỗi UUID sẽ luôn có cùng 1 số (consistent)

**Files:**
1. `src/renderer/src/utils/profileId.ts` - Utility function mới
```typescript
export function getDisplayId(uuid: string): string {
  if (uuid.startsWith('profile-')) {
    return uuid.replace('profile-', '')
  }
  
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const numericId = Math.abs(hash) % 9000 + 1001
  return numericId.toString()
}
```

2. `src/renderer/src/components/ProfileRow.tsx` - Sử dụng function
```typescript
import { getDisplayId } from '../utils/profileId'

// In render:
{getDisplayId(profile.id)}
```

---

### 3. ✅ Bug "All Status" kéo dài đẩy mất Sort + Reset
**Vấn đề:** Dropdown "All Status" quá rộng (160px) làm đẩy nút Sort và Reset ra ngoài màn hình

**Fix:** Giảm width từ 160px xuống 120px

**File:** `src/renderer/src/pages/ProfilesPage.tsx`
```typescript
// Before:
className="h-9 w-[160px] flex-shrink-0"

// After:
className="h-9 w-[120px] flex-shrink-0"
```

---

## Kết quả

✅ Đếm nhóm chính xác (chỉ đếm nhóm thực tế, không tính "Tất cả" và "Không có nhóm")
✅ ID hiển thị ngắn gọn, dễ đọc hơn
✅ Layout header không bị đẩy, tất cả controls đều hiển thị đúng vị trí

## Files đã sửa

1. `src/renderer/src/pages/ProfilesPage.tsx` - Fix đếm nhóm và width của All Status
2. `src/renderer/src/components/ProfileRow.tsx` - Fix hiển thị ID
3. `src/renderer/src/utils/profileId.ts` - Utility function để convert UUID → số

## Testing

Để test các fix:
```bash
npm start
```

Kiểm tra:
1. ✅ Số nhóm hiển thị đúng (không tính "Tất cả" + "Không có nhóm")
2. ✅ ID hiển thị số từ 1001-9999 (mỗi UUID có 1 số cố định)
3. ✅ Nút Sort và Reset không bị đẩy ra ngoài
