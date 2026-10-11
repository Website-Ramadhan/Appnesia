const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Koneksi database (Railway otomatis kasih DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

// ============================================================
// BUAT TABEL OTOMATIS (kalau belum ada)
// ============================================================
async function buatTabel() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pesanan (
        id SERIAL PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL,
        produk TEXT NOT NULL,
        produk_nama TEXT NOT NULL,
        harga INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabel pesanan siap');
  } catch (e) {
    console.error('❌ Error buat tabel:', e.message);
  }
}
buatTabel();

// ============================================================
// ENDPOINT API
// ============================================================

// 1. GET — Lihat semua pesanan
app.get('/api/pesanan', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pesanan ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. GET — Lihat pesanan berdasarkan order_id
app.get('/api/pesanan/:order_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pesanan WHERE order_id = $1', [req.params.order_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. POST — Kirim pesanan baru
app.post('/api/pesanan', async (req, res) => {
  try {
    const { order_id, produk, produk_nama, harga, status } = req.body;
    if (!order_id || !produk || !produk_nama || !harga) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    const result = await pool.query(
      `INSERT INTO pesanan (order_id, produk, produk_nama, harga, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [order_id, produk, produk_nama, harga, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Order ID sudah ada' });
    }
    res.status(500).json({ error: e.message });
  }
});

// 4. PUT — Ubah status pesanan
app.put('/api/pesanan/:order_id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'menunggu', 'lunas', 'gagal'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }
    const result = await pool.query(
      `UPDATE pesanan SET status = $1, updated_at = NOW()
       WHERE order_id = $2
       RETURNING *`,
      [status, req.params.order_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. GET — Health check
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    app: 'AppNesia Server',
    time: new Date().toISOString()
  });
});

// ============================================================
// JALANKAN SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server AppNesia jalan di port ${PORT}`);
});
