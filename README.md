# SyriaSP Mobile Client MVP

واجهة موبايل بسيطة تستخدم API السيريا مباشرة.

## الميزات

1. **تسجيل دخول** - بريد إلكتروني + كلمة مرور
2. **تأكيد PIN** - كود الحماية (6 أرقام)
3. **توثيق الهوية** - رفع صور الهوية
4. **البطاقات الافتراضية**:
    - عرض البطاقات
    - إصدار بطاقة جديدة
    - شحن البطاقة (topup)
    - تجميد / إلغاء تجميد
    - إلغاء البطاقة
    - عرض بيانات البطاقة (رقم + CVV)
    - عرض المعاملات

## التشغيل

```bash
cd mobile-client
npm install
npm run dev
```

يفتح على `http://localhost:3333`

## التعديل

غيّر `BASE_URL` في `src/lib/api.js` لو عاوز تشير على سيرفر محلي:

```js
const BASE_URL = 'http://syriasp.test/api'; // مثلاً
```

## Stack

- React 18 + Vite
- Tailwind CSS
- Axios
- React Router
- Lucide Icons
- React Hot Toast
