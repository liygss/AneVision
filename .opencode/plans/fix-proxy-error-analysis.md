# Perbaikan: "Proxy error / Analisis Gagal - Prediksi gagal"

## Diagnosis
- Backend port 8000 sempat mati (dihentikan setelah pengujian sesi sebelumnya) → Vite proxy `/api` gagal (ECONNREFUSED) → membalas 500 non-JSON → `api.ts` jatuh ke fallback `"Prediksi gagal. Silakan coba lagi."` → banner merah keliru.
- Status: backend sudah dinyalakan lagi, `/health` → 200, kedua model loaded. Analisis normal berfungsi.

## Sisa pekerjaan kode (menunggu mode read-only dilepas)

1. `frontend/src/services/api.ts` — di blok `if (!response.ok)`:
   - parse `json = looksLikeJson(response)` dulu; `errorData` hanya jika JSON.
   - setelah cabang 404: `if (!json || response.status >= 500) throw new BackendUnreachableError("Server analisis tidak dapat dihubungi. Pastikan backend berjalan, lalu coba lagi.")`
   - hasil: proxy error → amber "Server tidak dapat dihubungi" (bukan merah "Prediksi gagal").

2. `frontend/src/pages/Screening.tsx`:
   - `const canAnalyze = eyeFile !== null && !loading && backend.state !== "offline";`
   - teks bantuan saat tombol mati karena offline: "Server analisis belum tersedia. Tekan 'Coba lagi' pada notifikasi di atas, lalu ulangi."
   - `useEffect`: `if (backend.state === "online") setBackendOffline(false)` (banner & tombol pulih setelah retry berhasil).

3. `frontend/package.json` — script baru:
   `"dev:full": "concurrently -k -n web,api -c cyan,magenta \"npm run dev\" \"npm run dev:backend\""` (concurrently sudah ada).

4. Verifikasi: `npm run lint && npm run build`; matikan backend sebentar → klik analisis → harus muncul amber, bukan "Prediksi gagal"; nyalakan lagi → analisis foto mata valid → 200 → /results.
