# Profile API 401 bo'yicha qo'llanma (boshqa frontend uchun)

Ushbu admin frontendda `profile` ishlashi uchun quyidagi tartib ishlatiladi. Boshqa frontend ham xuddi shu tartibni qilsa, `401` holatlari kamayadi.

## 1) Login javobidan tokenlarni to'g'ri oling

Backenddan kelishi mumkin bo'lgan nomlar:

- `accessToken`
- `access_token`
- `token`
- `refreshToken`
- `refresh_token`

Saqlash tavsiyasi:

- `localStorage.setItem("accessToken", accessToken)`
- `localStorage.setItem("access_token", accessToken)` (legacy uchun)
- `localStorage.setItem("refreshToken", refreshToken)` va `refresh_token`

## 2) Har bir protected so'rovda header yuboring

`profile` uchun minimal talab:

- `Authorization: Bearer <accessToken>`

Admin loyihadagi qo'shimcha foydali headerlar:

- `x-device-id: <stable_device_id>`
- `x-platform: web`

`x-device-id` uchun bir marta generatsiya qilib localStorage'da saqlang.

## 3) Profile endpoint fallback tartibi

Bu loyihada quyidagi ketma-ketlik ishlatilgan:

1. `/users/my/profile`
2. `/users/profile/me`
3. `/users/profile`

Javobdan userni olishda bir nechta formatga tayyor bo'ling:

- `data.myProfile`
- `data.profile`
- `data.user`
- `data.data`

## 4) 401 bo'lsa refresh qiling, keyin so'rovni qayta yuboring

Refresh endpoint:

- `POST /auth/refresh/token`

Admin frontend amaliyoti:

- refresh so'rovida `withCredentials: true`
- `x-device-id` yuboriladi
- yangi access token qaytsa saqlanadi
- original so'rov `Authorization: Bearer <newToken>` bilan qayta yuboriladi

Refresh ham `401/403` qaytarsa:

- barcha auth ma'lumotlarini tozalang
- login sahifaga yo'naltiring

## 5) Eng ko'p uchraydigan 401 sabablari

1. `Authorization` header umuman yuborilmagan.
2. `Bearer` prefiksi qo'yilmagan (`Authorization: <token>` noto'g'ri).
3. Login tokeni noto'g'ri key bilan saqlangan (`accessToken` bor, lekin kod `access_token` o'qiyapti yoki aksincha).
4. Noto'g'ri `baseURL` (boshqa environment API'ga urilyapti).
5. Refresh ishlamayapti (token yangilanmayapti).
6. Backend user/company ni inactive qilgan (`403` ham bo'lishi mumkin).

## 6) Tekshirish checklist (tezkor)

1. DevTools -> Network -> profile requestni oching.
2. `Request Headers` ichida `Authorization: Bearer ...` borligini tekshiring.
3. `Request URL` to'g'ri API ga ketayotganini tekshiring.
4. `401` qaytsa refresh request yuborilayotganini tekshiring.
5. Refresh muvaffaqiyatli bo'lsa, profile request qayta ketayotganini tekshiring.

## 7) Minimal axios misol

```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const getToken = () =>
  localStorage.getItem("accessToken") || localStorage.getItem("access_token") || "";

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh/token`,
        {},
        { withCredentials: true }
      );
      const newToken =
        refresh?.data?.access_token || refresh?.data?.accessToken || refresh?.data?.token;
      if (newToken) {
        localStorage.setItem("accessToken", newToken);
        localStorage.setItem("access_token", newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
```

## 8) Shu repo ichida reference joylar

- `src/http/api.js` (admin interceptor + refresh oqimi)
- `src/store/userSlice.js` (profile fallback endpointlar)
- `src/pages/login/Login.jsx` (login + profile tekshiruv)
