import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env) {
    // ============================================================
    // 1. KONFIGURASI CORS — support semua method
    // ============================================================
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ============================================================
    // 2. 🔐 CEK TOKEN ADMIN
    //    Kecuali: "/" dan "POST /api/pesanan" (pembeli bikin pesanan)
    // ============================================================
    if (path !== '/') {
      const isPublicPost = (path === '/api/pesanan' && method === 'POST');

      if (!isPublicPost) {
        const tokenDariClient = request.headers.get('X-Admin-Token');
        const TOKEN_RAHASIA = env.ADMIN_TOKEN;

        if (!TOKEN_RAHASIA) {
          return new Response(
            JSON.stringify({ error: 'Server belum dikonfigurasi (ADMIN_TOKEN kosong)' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (tokenDariClient !== TOKEN_RAHASIA) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // ============================================================
    // 3. INISIALISASI SUPABASE
    // ============================================================
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Environment Variables Supabase belum diisi!' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      // ============================================================
      // ENDPOINT 1: GET / — Health check (publik)
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

      // ============================================================
      // ENDPOINT 2: GET /api/pesanan — Lihat semua pesanan (admin)
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
      // ENDPOINT 3: POST /api/pesanan — Bikin pesanan baru (publik)
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
      // ENDPOINT 4: GET /api/pesanan/:id — Lihat 1 pesanan (admin)
      // ============================================================
      if (path.startsWith('/api/pesanan/') && method === 'GET') {
        const orderId = decodeURIComponent(path.split('/').pop());
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
      // ENDPOINT 5: PUT /api/pesanan/:id — Ubah status (admin)
      // ============================================================
      if (path.startsWith('/api/pesanan/') && method === 'PUT') {
        const orderId = decodeURIComponent(path.split('/').pop());

        let body;
        try { body = await request.json(); } catch (e) {
          return new Response(JSON.stringify({ error: 'Body JSON tidak valid' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

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

        return new Response(JSON.stringify({ success: true, data: data[0] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // ENDPOINT 6: DELETE /api/pesanan/:id — Hapus pesanan (admin)
      // ============================================================
      if (path.startsWith('/api/pesanan/') && method === 'DELETE') {
        const orderId = decodeURIComponent(path.split('/').pop());

        const { data, error } = await supabase
          .from('pesanan')
          .delete()
          .eq('order_id', orderId)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          return new Response(JSON.stringify({ error: 'Pesanan tidak ditemukan' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, order_id: orderId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ============================================================
      // 404 — Route tidak dikenal
      // ============================================================
      return new Response(JSON.stringify({
        error: 'Not Found',
        path: path,
        method: method
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({
        error: e.message || 'Internal Error'
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};
