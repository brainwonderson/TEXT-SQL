import mysql.connector
from mysql.connector import Error

def create_demo_database():
    config = {
        'host': 'localhost',
        'user': 'root',
        'password': '' # Default password for Laragon mysql is empty or '123456' as in user request
    }
    
    print("Mencoba menghubungkan ke MySQL server lokal...")
    
    conn = None
    try:
        # First connect without database to create it
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Check if we should use '123456' if default fails (optional, try except)
        db_name = "ecomart"
        print(f"Membuat database '{db_name}' jika belum ada...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.close()
        conn.close()
        
        # Now connect to ecomart database
        config['database'] = db_name
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        # Create 'pelanggan' table
        print("Membuat tabel 'pelanggan'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pelanggan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                email VARCHAR(100),
                kota VARCHAR(50)
            )
        """)
        
        # Create 'produk' table
        print("Membuat tabel 'produk'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS produk (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_produk VARCHAR(100) NOT NULL,
                kategori VARCHAR(50),
                harga DECIMAL(10, 2) NOT NULL,
                stok INT DEFAULT 0
            )
        """)
        
        # Create 'pesanan' table
        print("Membuat tabel 'pesanan'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pesanan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_pelanggan INT,
                id_produk INT,
                jumlah INT NOT NULL,
                tanggal_pesanan DATE,
                total_harga DECIMAL(10, 2),
                FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id),
                FOREIGN KEY (id_produk) REFERENCES produk(id)
            )
        """)
        
        # Check if tables have data
        cursor.execute("SELECT COUNT(*) FROM pelanggan")
        if cursor.fetchone()[0] == 0:
            print("Memasukkan data sampel pelanggan...")
            pelanggan_data = [
                ("Budi Santoso", "budi@gmail.com", "Jakarta"),
                ("Siti Rahma", "siti@yahoo.com", "Surabaya"),
                ("Rian Wijaya", "rian@outlook.com", "Bandung"),
                ("Dewi Lestari", "dewi@gmail.com", "Medan"),
                ("Andi Pratama", "andi@gmail.com", "Jakarta")
            ]
            cursor.executemany("INSERT INTO pelanggan (nama, email, kota) VALUES (%s, %s, %s)", pelanggan_data)
            
        cursor.execute("SELECT COUNT(*) FROM produk")
        if cursor.fetchone()[0] == 0:
            print("Memasukkan data sampel produk...")
            produk_data = [
                ("Laptop Asus ROG", "Elektronik", 15000000.00, 10),
                ("Smartphone Samsung S23", "Elektronik", 12000000.00, 15),
                ("Keyboard Mechanical", "Aksesoris", 850000.00, 30),
                ("Mouse Gaming", "Aksesoris", 450000.00, 50),
                ("Monitor LG 24 inch", "Elektronik", 1800000.00, 12),
                ("Kaos Polos Cotton", "Pakaian", 75000.00, 100),
                ("Celana Jeans Denim", "Pakaian", 250000.00, 40)
            ]
            cursor.executemany("INSERT INTO produk (nama_produk, kategori, harga, stok) VALUES (%s, %s, %s, %s)", produk_data)
            
        cursor.execute("SELECT COUNT(*) FROM pesanan")
        if cursor.fetchone()[0] == 0:
            print("Memasukkan data sampel pesanan...")
            pesanan_data = [
                (1, 1, 1, "2026-06-01", 15000000.00), # Budi beli Laptop
                (2, 3, 1, "2026-06-05", 850000.00),    # Rian beli Keyboard
                (3, 2, 2, "2026-06-10", 24000000.00),  # Siti beli 2 Samsung
                (4, 4, 3, "2026-06-15", 1350000.00),   # Dewi beli 3 Mouse
                (5, 5, 6, "2026-06-20", 375000.00),    # Andi beli 5 Kaos
                (1, 4, 2, "2026-06-22", 900000.00),    # Budi beli 2 Mouse
                (2, 1, 1, "2026-06-25", 15000000.00)   # Siti beli Laptop
            ]
            # Since pesanan table schema has id_pelanggan, id_produk, jumlah, tanggal_pesanan, total_harga
            cursor.executemany("""
                INSERT INTO pesanan (id_pelanggan, id_produk, jumlah, tanggal_pesanan, total_harga) 
                VALUES (%s, %s, %s, %s, %s)
            """, pesanan_data)
            
        conn.commit()
        print("Database 'ecomart' dan tabel demo berhasil dikonfigurasi!")
        cursor.close()
        conn.close()
        return True
        
    except Error as e:
        print(f"\nError: Gagal mengonfigurasi MySQL: {str(e)}")
        print("TIPS: Pastikan MySQL Server di komputer lokal Anda (Laragon/XAMPP) sudah dijalankan.")
        print("Jika user/password MySQL berbeda, silakan sesuaikan variabel 'config' di file 'seed_ecomart.py'.")
        if conn:
            conn.close()
        return False

if __name__ == '__main__':
    create_demo_database()
