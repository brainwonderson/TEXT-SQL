## Deskripsi

### Text-to-SQL Translator & AI Data Analyst
Aplikasi berbasis web yang menggunakan kecerdasan buatan (Generative AI) dari Google Gemini untuk menerjemahkan pertanyaan bahasa alami (Bahasa Indonesia) menjadi query MySQL secara otomatis, mengeksekusinya ke database lokal, dan menyajikan hasilnya beserta penjelasan analisis data yang komunikatif.

## 🌟 Fitur Utama
- **Koneksi Database Dinamis**: Hubungkan aplikasi ke database MySQL lokal Anda dengan mudah melalui panel konfigurasi (Host, Port, Username, Password, & Nama Database).
- **Auto Schema Detection**: Aplikasi secara otomatis membaca skema database (daftar tabel, struktur kolom, tipe data, dan *primary key*) untuk dijadikan konteks bagi model AI.
- **Penerjemah Text-to-SQL**: Menerjemahkan pertanyaan sehari-hari seperti *"Siapa saja pelanggan yang tinggal di Jakarta?"* menjadi query SQL (`SELECT ...`) yang valid.
- **Eksekutor Query Aman**: Mengeksekusi query hasil terjemahan langsung ke database (dibatasi hanya untuk perintah `SELECT` demi keamanan data).
- **AI Data Analyst Explanation**: Menjelaskan baris data hasil eksekusi SQL ke dalam bahasa sehari-hari yang ramah, natural, dan mudah dipahami oleh pengguna non-teknis.
- **Script Seeding Demo**: Menyediakan script `seed_ecomart.py` untuk membuat database tiruan e-commerce bernama `ecomart` secara instan beserta data sampelnya.

## 🛠️ Tech Stack
- **Backend**: Python 3.x, Flask (Framework Web), Flask-Cors, MySQL Connector Python.
- **Frontend**: HTML5, Vanilla CSS (Modern Dark Mode & Glassmorphic UI), Vanilla JavaScript.
- **AI Integration**: Google Generative AI (`google-generativeai` SDK) menggunakan model seri **Gemini Flash** (seperti `gemini-1.5-flash` / `gemini-2.0-flash` / `gemini-3.5-flash`).

## 📂 Struktur Proyek
```text
TEXT-SQL/
├── app.py                 # Server backend Flask (Routing API & Integrasi Gemini)
├── seed_ecomart.py        # Script pembuat & pengisi database demo 'ecomart'
├── requirements.txt       # Daftar dependensi Python yang dibutuhkan
├── .env                   # Konfigurasi environment variables (API Key & Port)
├── templates/
│   └── index.html         # Halaman antarmuka utama aplikasi (UI)
└── static/
    ├── css/
    │   └── style.css      # Styling tampilan (modern dark mode, card, tabel)
    └── js/
        └── app.js         # Logika frontend (HTTP request, rendering data & skema)
```
---

## 🚀 Panduan Instalasi & Penggunaan
Ikuti langkah-langkah berikut untuk menjalankan aplikasi di komputer lokal Anda:
### 1. Prasyarat (Prerequisites)
Pastikan Anda sudah menginstal:
* [Python](https://www.python.org/downloads/) (versi 3.8 ke atas direkomendasikan)
* Server MySQL berjalan (melalui **Laragon**, **XAMPP**, atau MySQL installer mandiri)
### 2. Kloning Repositori
```bash
git clone https://github.com/USERNAME/TEXT-SQL.git
cd TEXT-SQL
```
*(Ganti `USERNAME` dengan nama pengguna GitHub Anda)*
### 3. Instal Dependensi Python
Instal seluruh library yang diperlukan dengan menjalankan perintah:
```bash
pip install -r requirements.txt
```

### 4. Konfigurasi Environment Variables (`.env`)
Buat atau edit file bernama `.env` di folder utama proyek dan isi konfigurasinya:
```env
GEMINI_API_KEY=isi_dengan_api_key_gemini_anda
PORT=5000
```
> **Catatan**: Anda bisa mendapatkan Gemini API Key gratis melalui [Google AI Studio](https://aistudio.google.com/).

### 5. Setup Database Demo (Opsional namun Direkomendasikan)
Untuk mencoba aplikasi dengan data sampel yang sudah siap pakai, jalankan script seeding untuk membuat database `ecomart`:
```bash
python seed_ecomart.py
```
Script ini akan:
1. Membuat database baru bernama `ecomart` jika belum ada di MySQL lokal Anda.
2. Membuat tabel `pelanggan`, `produk`, dan `pesanan`.
3. Memasukkan data simulasi transaksi e-commerce.

### 6. Jalankan Server Flask
Jalankan aplikasi dengan perintah:
```bash
python app.py
```
Setelah berjalan, buka browser Anda dan akses:
**`http://localhost:5000`**

---

## 💡 Cara Penggunaan di Antarmuka Web
1. **Konfigurasi Koneksi & API**:
   - Isi kredensial MySQL lokal Anda di panel sebelah kiri (Default: `localhost`, port `3306`, user `root`, password dikosongkan/diisi sesuai MySQL Anda).
   - Masukkan nama database (misalnya: `ecomart`).
   - Masukkan **Gemini API Key** Anda (jika belum didefinisikan di `.env`).
   - Klik **Hubungkan & Ambil Skema**.
2. **Lihat Skema**:
   - Setelah sukses terhubung, skema tabel beserta kolom-kolomnya akan muncul di panel kiri bawah sebagai referensi Anda.
3. **Mulai Bertanya**:
   - Ketik pertanyaan Anda di kolom pencarian sebelah kanan, contoh:
     - *"Tampilkan 3 produk dengan harga termahal"*
     - *"Berapa jumlah pesanan dari pelanggan bernama Budi Santoso?"*
     - *"Kategori produk apa yang memiliki stok paling sedikit?"*
   - Klik tombol **Kirim Pertanyaan** (atau tekan Enter).
4. **Analisis Hasil**:
   - Aplikasi akan menampilkan **Query SQL** yang dibuat secara otomatis oleh Gemini.
   - Tabel berisi **Data Hasil Eksekusi** dari database MySQL Anda.
   - **Penjelasan AI** yang menguraikan makna atau jawaban dari data tersebut secara interaktif.

---

## 🔒 Keamanan & Batasan
* Aplikasi ini dirancang untuk kebutuhan **analisis data & baca data saja**.
* Sistem secara ketat menginstruksikan model AI untuk hanya menghasilkan query bertipe `SELECT`. Perintah modifikasi data (`INSERT`, `UPDATE`, `DELETE`, `DROP`) akan ditolak atau dibatasi demi menjaga integritas database Anda.

---

## Dokumentasi
<img width="1878" height="827" alt="Screenshot 2026-07-06 160108" src="https://github.com/user-attachments/assets/a1c882b7-5058-415f-b2f8-26d639d368b5" />


## 🤝 Kontribusi
Kontribusi, saran, dan pelaporan bug sangat dipersilakan! Silakan buka *Issue* atau kirimkan *Pull Request* di repositori ini.

---

**Dibuat dengan ❤️ menggunakan Python Flask dan Google Gemini API**
