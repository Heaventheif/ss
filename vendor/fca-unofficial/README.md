# fca-unofficial (نسخة داخلية مصححة)

مكتبة Facebook Chat API غير رسمية — نسخة معدَّلة محلياً للاستخدام الداخلي، JavaScript خالص (بدون TypeScript، بدون sqlite3/Sequelize).

## التثبيت (كاعتمادية محلية)

في `package.json` لمشروعك:
```json
"dependencies": {
  "fca-unofficial": "file:./vendor/fca-unofficial"
}
```
ثم `npm install`.

## الإعداد (`fca-config.json`)

- `autoLogin`: `false` افتراضياً. لو فعّلته، **لازم** تحدد `apiServer` بنفسك — المكتبة ترفض إرسال أي بيانات دخول لأي خادم غير محدد صراحة (لا يوجد خادم افتراضي مضمّن إطلاقاً).
- `checkUpdate.enabled`: `false` افتراضياً — لا اتصال دوري بأي سجل npm خارجي إلا لو فعّلته وحددت `packageName`/`registryUrl` بنفسك.
- الطريقة الموصى بها لتسجيل الدخول: `appState`/كوكيز مُصدَّرة من المتصفح (لا تمر عبر أي خادم وسيط، اتصال مباشر بـ facebook.com فقط).

## التخزين

بيانات المستخدمين/الثريدات تُحفظ محلياً كملفات JSON تحت `Fca_Database/` (لا حاجة لأي قاعدة بيانات خارجية أو إضافة C++‎).
