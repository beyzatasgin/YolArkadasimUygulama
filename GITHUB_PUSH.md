# GitHub'a Güncelleme Talimatları

## Önemli Güvenlik Notu
✅ `.env` dosyası `.gitignore`'da olduğu için GitHub'a gitmeyecek. API key'leriniz güvende!

## GitHub'a Push Adımları

1. **Proje klasörüne gidin:**
   ```bash
   cd "C:\Users\Beyza\OneDrive - sakarya.edu.tr\Masaüstü\yolarkadasim (2)\yolarkadasim"
   ```

2. **Değişiklikleri kontrol edin:**
   ```bash
   git status
   ```

3. **Tüm değişiklikleri ekleyin:**
   ```bash
   git add .
   ```

4. **Commit yapın:**
   ```bash
   git commit -m "Yol Arkadaşım: Login sayfası güncellendi, şifre değiştirme eklendi, otel önerileri eklendi, seyahat silme/düzenleme özellikleri eklendi"
   ```

5. **GitHub'a push yapın:**
   ```bash
   git push origin main
   ```

## Alternatif: VS Code veya Cursor'dan

1. VS Code/Cursor'da Source Control (Ctrl+Shift+G) sekmesine gidin
2. Değişiklikleri gözden geçirin
3. "+" işaretine tıklayarak tüm değişiklikleri stage edin
4. Commit mesajı yazın ve Commit butonuna tıklayın
5. "..." menüsünden "Push" seçeneğini seçin

## Not
- `.env` dosyası otomatik olarak ignore edilecek
- Eğer `.env` dosyası yanlışlıkla eklenmişse, önce kaldırın:
  ```bash
  git rm --cached .env
  ```

