import os
import re
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Global database configuration in memory for simplicity in local dev
db_config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': ''
}

def get_db_connection():
    """Establishes connection to MySQL using the current global config."""
    if not db_config.get('database'):
        raise Exception("Database name not configured. Please connect first.")
    
    return mysql.connector.connect(
        host=db_config['host'],
        port=db_config['port'],
        user=db_config['user'],
        password=db_config['password'],
        database=db_config['database']
    )

def fetch_db_schema():
    """Retrieves list of tables and columns to build schema context for Gemini."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get list of tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        schema_info = []
        for table_dict in tables:
            # Table name is the only key
            table_name = list(table_dict.values())[0]
            
            # Get columns for this table
            cursor.execute(f"DESCRIBE `{table_name}`")
            columns = cursor.fetchall()
            
            col_desc = []
            for col in columns:
                col_name = col['Field']
                col_type = col['Type']
                col_key = col['Key'] # PRI, MUL, etc.
                extra = f" (Primary Key)" if col_key == 'PRI' else ""
                col_desc.append(f"  - {col_name} ({col_type}){extra}")
            
            schema_info.append(f"Table: {table_name}\n" + "\n".join(col_desc))
            
        cursor.close()
        conn.close()
        
        return "\n\n".join(schema_info)
    except Exception as e:
        raise Exception(f"Gagal mengambil skema database: {str(e)}")

def clean_sql_query(sql_query):
    """Cleans up the generated SQL code blocks if Gemini wraps it in markdown."""
    sql_query = sql_query.strip()
    # Remove markdown code block markers
    sql_query = re.sub(r'^```sql\s*', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'^```\s*', '', sql_query)
    sql_query = re.sub(r'\s*```$', '', sql_query)
    # Remove trailing or leading whitespaces
    return sql_query.strip()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/connect', methods=['POST'])
def connect_db():
    global db_config
    data = request.json or {}
    
    host = data.get('host', 'localhost')
    port = int(data.get('port', 3306))
    user = data.get('user', 'root')
    password = data.get('password', '')
    database = data.get('database', '')
    
    if not database:
        return jsonify({'success': False, 'message': 'Nama database harus diisi'}), 400
        
    try:
        # Test connection
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        conn.close()
        
        # Save config if successful
        db_config = {
            'host': host,
            'port': port,
            'user': user,
            'password': password,
            'database': database
        }
        
        # Also return schema information
        schema = fetch_db_schema()
        
        return jsonify({
            'success': True, 
            'message': f'Berhasil terhubung ke database {database}',
            'schema': schema
        })
    except Error as e:
        return jsonify({'success': False, 'message': f'Koneksi gagal: {str(e)}'}), 400

@app.route('/api/schema', methods=['GET'])
def get_schema():
    try:
        schema = fetch_db_schema()
        return jsonify({'success': True, 'schema': schema})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/query', methods=['POST'])
def run_query():
    data = request.json or {}
    question = data.get('question', '')
    api_key_input = data.get('api_key', '')
    
    if not question:
        return jsonify({'success': False, 'message': 'Pertanyaan tidak boleh kosong'}), 400
        
    # Determine API key (from request or env)
    api_key = api_key_input or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({
            'success': False, 
            'message': 'Gemini API Key tidak ditemukan. Silakan isi API Key di file .env atau masukkan langsung di panel konfigurasi.'
        }), 400

    try:
        # 1. Get database schema to provide context to Gemini
        schema_context = fetch_db_schema()
        if not schema_context:
            return jsonify({'success': False, 'message': 'Database kosong atau tidak memiliki tabel.'}), 400
            
        # Configure Gemini API
        genai.configure(api_key=api_key)
        
        # Get list of models available with this API key
        available_models = []
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available_models.append(m.name.replace('models/', ''))
        except Exception as list_err:
            print(f"Gagal me-list model: {str(list_err)}")

        # Select model
        selected_model = 'gemini-1.5-flash'
        if available_models:
            preferred_models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash']
            for pref in preferred_models:
                if pref in available_models:
                    selected_model = pref
                    break
            else:
                # If none of preferred are there, pick first generateContent model
                selected_model = available_models[0]
        
        print(f"Menggunakan model Gemini: {selected_model}")
        model = genai.GenerativeModel(selected_model)
        
        # 2. Ask Gemini to generate SQL
        sql_prompt = f"""
Kamu adalah seorang ahli database MySQL dan AI Text-to-SQL Translator.
Tugasmu adalah menerjemahkan pertanyaan pengguna berikut (dalam Bahasa Indonesia) menjadi query SQL yang valid dan aman untuk database MySQL.

Berikut adalah skema database yang sedang aktif saat ini:
{schema_context}

Aturan Penulisan SQL:
1. Output HANYA boleh berisi query SQL yang valid. Jangan memberikan penjelasan apa pun sebelum atau setelah SQL.
2. Jangan menggunakan format kode markdown (misalnya ```sql atau ```). Kembalikan langsung query SQL-nya saja.
3. Pastikan query SQL merujuk pada nama tabel dan kolom yang benar sesuai skema di atas.
4. Gunakan operator perbandingan yang sesuai (seperti LIKE untuk pencarian teks).
5. Jika pertanyaan meminta data teratas/terlaris/terbanyak, gunakan klausa ORDER BY dan LIMIT secara bijak.
6. Hasilkan query bertipe SELECT saja demi keamanan database.

Pertanyaan Pengguna: "{question}"
Query SQL:
"""
        sql_response = model.generate_content(sql_prompt)
        raw_sql = sql_response.text
        sql_query = clean_sql_query(raw_sql)
        
        # 3. Execute the SQL query
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Execute query
        cursor.execute(sql_query)
        
        # Get column names
        columns = [col[0] for col in cursor.description] if cursor.description else []
        
        # Fetch all rows
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format rows for JSON serialization and explanation input
        formatted_rows = []
        for row in rows:
            formatted_row = {}
            for col_name, val in zip(columns, row):
                # Convert bytes or other non-serializable objects to string if needed
                if isinstance(val, (bytes, bytearray)):
                    val = val.decode('utf-8', errors='ignore')
                elif val is not None:
                    # Keep integers, floats, and strings as is, convert others to string
                    if not isinstance(val, (int, float, str, bool)):
                        val = str(val)
                formatted_row[col_name] = val
            formatted_rows.append(formatted_row)
            
        # 4. Ask Gemini to explain the SQL query results
        explanation_prompt = f"""
Kamu adalah AI data analyst yang ramah dan profesional.
Tugasmu adalah menjelaskan hasil dari eksekusi query SQL kepada pengguna dalam Bahasa Indonesia yang alami, komunikatif, dan mudah dipahami.

Pertanyaan Awal Pengguna: "{question}"
Query SQL yang Dijalankan: {sql_query}
Hasil Query (Format JSON): {formatted_rows}

Aturan Penulisan Penjelasan:
1. Jelaskan secara langsung jawaban dari pertanyaan pengguna berdasarkan data hasil query di atas.
2. Gunakan Bahasa Indonesia yang natural dan ramah.
3. Hindari menyebutkan istilah teknis database yang tidak perlu seperti "tabel", "kolom", "query", atau "SELECT" kecuali jika membantu penjelasan.
4. Tampilkan informasi yang relevan saja. Jika hasil query kosong, katakan bahwa data yang dicari tidak ditemukan dengan sopan.
5. Format penjelasan agar rapi (boleh menggunakan bullet points jika datanya berupa daftar).

Penjelasan:
"""
        explanation_response = model.generate_content(explanation_prompt)
        explanation = explanation_response.text.strip()
        
        return jsonify({
            'success': True,
            'sql': sql_query,
            'columns': columns,
            'rows': formatted_rows,
            'explanation': explanation
        })
        
    except Error as e:
        # Error database
        return jsonify({
            'success': False,
            'error_type': 'database',
            'sql': sql_query if 'sql_query' in locals() else None,
            'message': f'Database Error: {str(e)}'
        }), 400
    except Exception as e:
        # General or Gemini API Error
        msg = str(e)
        if 'available_models' in locals() and available_models:
            msg += f"\n\nModel yang tersedia pada API Key Anda: {', '.join(available_models)}"
        return jsonify({
            'success': False,
            'error_type': 'general',
            'message': f'Error: {msg}'
        }), 400

if __name__ == '__main__':
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    print(f"Server berjalan di http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
