# Security Rules

## Secret Handling
- Khong bao gio in secret.
- Khong commit `.env`, token, cookie, credential, private key, browser session.
- Dung placeholder trong docs va vi du.
- Kiem tra log/error khong lo thong tin nhay cam.

## Auth And Permission
- Khong lam yeu validation, auth, permission de fix loi nhanh.
- Uu tien least privilege.
- Xu ly loi auth ro rang nhung khong leak chi tiet nhay cam.

## Local Data
Xem cac file sau la nhay cam:
- Auth/config local.
- Logs co request/response.
- Browser profiles.
- Session/cache.
- Database local co user data.

