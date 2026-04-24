# TODO — Correção Build APK GitHub Actions

- [x] 1. Atualizar Java 17 → 21 no workflow (`build-android.yml`)
- [x] 2. Criar google-services.json inline no workflow com dados do projeto (evita dependência de secret)
- [x] 3. Incluir passo no workflow para gerar `android/app/google-services.json` antes do `cap sync`
- [ ] 4. Testar push na main e verificar se build passa

