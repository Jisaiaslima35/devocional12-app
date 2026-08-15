# Devocional 12 — PWA + APK

Rádio gospel 24h com locutor IA Irmão Eliseu, mural de oração, sala devocional privada e notificações push.

## URL pública

- Site: https://devocional12.automacaojs.us
- Web Push: https://webpush.automacaojs.us

## Build local

```bash
npm install
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

## CI/CD

GitHub Actions builda APK em todo push na `main`. Artefato: `devocional12-app-debug` (14 dias retenção).
