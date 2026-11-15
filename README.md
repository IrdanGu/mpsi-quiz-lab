# Quiz Lab — MPSI

Aplikasi latihan pilihan ganda untuk materi PSSI Bab 1–7.

## Cara menggunakan

1. Buka `index.html` di browser.
2. Pilih Bab 1–7 atau **Ronde Boss**.
3. Jawab 10 soal pada ronde bab atau 20 soal pada Ronde Boss.
4. Setelah ronde selesai, record otomatis disimpan di `localStorage` browser.

## Arsitektur

- `index.html` — struktur halaman dan tiga state utama: daftar bab, kuis, hasil.
- `styles.css` — tampilan editorial-minimalis yang dikembangkan dari template referensi.
- `app.js` — state kuis, pengacakan, timer, histori, status penguasaan, dan review jawaban.
- `data.js` — bank soal browser-ready hasil generate dari catatan PSSI.
- `scripts/generate_quiz_data.py` — generator bank soal dari `mssi-soal-bab-01-07.md`.

## Memperbarui bank soal

Jika file sumber soal berubah, jalankan dari root vault:

```powershell
uv run --python 3.12 python "02_Areas/University/MPSI/kuis-pilihan-ganda/scripts/generate_quiz_data.py"
```

Generator memvalidasi bahwa terdapat 70 soal pilihan ganda sebelum menulis `data.js`.

## Status penguasaan

- `80–100%` — Menguasai
- `60–79%` — Perlu latihan
- `0–59%` — Belum menguasai

Record disimpan dengan key `mpsi-quiz-records-v1`. Data record tidak dikirim ke server.
