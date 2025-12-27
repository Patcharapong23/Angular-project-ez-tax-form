# วิธีติดตั้งหน้า Legal Pages

## ไฟล์ที่สร้างให้

โครงสร้างโฟลเดอร์:

```
legal/
├── legal.module.ts
├── terms/
│   ├── terms.component.ts
│   ├── terms.component.html
│   └── terms.component.css
├── privacy-policy/
│   ├── privacy-policy.component.ts
│   ├── privacy-policy.component.html
│   └── privacy-policy.component.css
└── cookies/
    ├── cookies.component.ts
    ├── cookies.component.html
    └── cookies.component.css
```

---

## ขั้นตอนการติดตั้ง

### 1. คัดลอกโฟลเดอร์

คัดลอกโฟลเดอร์ `legal` ทั้งหมดไปไว้ที่:

```
src/app/pages/legal/
```

### 2. อัพเดท Routing

เปิดไฟล์ `src/app/app-routing.module.ts` และเพิ่ม route นี้:

```typescript
{
  path: 'legal',
  loadChildren: () => import('./pages/legal/legal.module').then(m => m.LegalModule)
}
```

### 3. เพิ่มลิงก์ในหน้าลงทะเบียน

เปิด `register.component.html` และเพิ่ม:

```html
<div class="terms-checkbox">
  <input type="checkbox" id="acceptTerms" formControlName="acceptTerms" />
  <label for="acceptTerms">
    ยอมรับ
    <a routerLink="/legal/terms" target="_blank">ข้อกำหนด</a>
    และ
    <a routerLink="/legal/privacy-policy" target="_blank"
      >นโยบายความเป็นส่วนตัว</a
    >
  </label>
</div>
```

---

## URLs ที่จะใช้ได้

| หน้า                  | URL                     |
| --------------------- | ----------------------- |
| ข้อกำหนด              | `/legal/terms`          |
| นโยบายความเป็นส่วนตัว | `/legal/privacy-policy` |
| คุกกี้                | `/legal/cookies`        |
