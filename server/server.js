    import { createClient } from '@supabase/supabase-js';

    export default {
    async fetch(request, env) {
    // ============================================================
    // 1. KONFIGURASI CORS (Agar bisa diakses dari admin.html)
    // ============================================================
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Tangani preflight request (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ============================================================
    // 2. INISIALISASI SUPABASE
    // ============================================================
    const supabaseUrl = env.SUPABASE_URL;https://ddnqfpeszktuvsypseyc.supabase.vo
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;SUPABASE_URL

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Environment Variables Supabase belum diisi!' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ============================================================
      // ENDPOINT 1: GET — Lihat semua pesanan
      // ============================================================
      if (path === '/api/pesanan' && method === 'GET') {
        const { data, error } = await supabase
          .from('pesanan')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // ENDPOINT 2: GET — Lihat pesanan berdasarkan order_id
      // ============================================================
      if (path.startsWith('/api/pesanan/') && method === 'GET') {
        const orderId = path.split('/').pop();
        const { data, error } = await supabase
          .from('pesanan')
          .select('*')
          .eq('order_id', orderId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return new Response(JSON.stringify({ error: 'Pesanan tidak ditemukan' }), {
              status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw error;
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // ENDPOINT 3: POST — Kirim pesanan baru
      // ============================================================
      if (path === '/api/pesanan' && method === 'POST') {
        const body = await request.json();
        const { order_id, produk, produk_nama, harga, status } = body;

        if (!order_id || !produk || !produk_nama || !harga) {
          return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('pesanan')
          .insert([{
            order_id,
            produk,
            produk_nama,
            harga,
            status: status || 'pending'
          }])
          .select();

        if (error) {
          if (error.code === '23505') {
            return new Response(JSON.stringify({ error: 'Order ID sudah ada' }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          throw error;
        }

        return new Response(JSON.stringify(data[0]), {
          status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // ENDPOINT 4: PUT — Ubah status pesanan (UNTUK LUNAS)
      // ============================================================
      if (path.startsWith('/api/pesanan/') && method === 'PUT') {
        const orderId = path.split('/').pop();
        const body = await request.json();
        const { status } = body;

        const validStatus = ['pending', 'menunggu', 'lunas', 'gagal'];
        if (!status || !validStatus.includes(status)) {
          return new Response(JSON.stringify({ error: 'Status tidak valid' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('pesanan')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          return new Response(JSON.stringify({ error: 'Pesanan tidak ditemukan' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(data[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // ENDPOINT 5: GET — Health check
      // ============================================================
      if (path === '/' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'OK',
          app: 'AppNesia Worker (Cloudflare)',
          time: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Jika rute tidak ditemukan
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
