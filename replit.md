# MacSkor

Dünya genelinde gerçek maç verileriyle canlı skor takibi, iddaa oranları ve analiz web uygulaması.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API sunucusu (port 5000)
- `pnpm --filter @workspace/mac-takip run dev` — Frontend (Vite React)
- `pnpm run typecheck` — Tüm paketlerde tip kontrolü
- `pnpm run build` — Typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI'den hook ve Zod şemalarını yenile
- Gerekli env: `DATABASE_URL` — PostgreSQL bağlantı stringi

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (standings fallback için)
- Veri kaynağı: ESPN Public API (ücretsiz, key gerektirmez)
- Odds motoru: Poisson dağılımı tabanlı özel algoritma
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (OpenAPI spec'ten)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + TanStack Query + Wouter + Tailwind + Shadcn/Radix

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (kaynak gerçekliği)
- `lib/api-client-react/src/generated/` — Orval üretilmiş React Query hook'ları
- `lib/api-zod/src/generated/` — Orval üretilmiş Zod şemaları
- `artifacts/api-server/src/lib/espn.ts` — ESPN API client (caching dahil)
- `artifacts/api-server/src/lib/odds.ts` — Poisson tabanlı iddaa oranları motoru
- `artifacts/api-server/src/routes/` — Express route dosyaları
- `artifacts/mac-takip/src/pages/` — Frontend sayfalar
- `artifacts/mac-takip/src/components/` — Paylaşılan bileşenler

## Architecture decisions

- **ESPN Public API**: Ücretsiz, key gerektirmeyen public API. `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard` ile tüm dünya maçları çekilir. Standings için `https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings` kullanılır.
- **On-the-fly odds hesaplama**: DB'ye yazmak yerine her request'te Poisson dağılımıyla oranlar hesaplanır. Takım formu ESPN'den direkt gelir ("DWWDL" formatında).
- **90 saniye cache**: ESPN API çağrıları 90 saniye cache'lenir (standings 5 dakika). Baskı azaltır, canlı hissini korur.
- **String match ID'leri**: ESPN event ID'leri string olduğundan tüm match ID'ler string olarak işlenir.
- **League slug sistemi**: `eng.1`, `esp.1`, `ger.1`, `ita.1`, `fra.1`, `tur.1`, `uefa.champions`, `uefa.europa`, `usa.1`, `ned.1`, `por.1`

## Product

- **Canlı Skor**: Dünyadan 40+ gerçek maç. Canlı, yaklaşan ve biten maçlar. Takım logolarıyla form rozetleri.
- **İddaa Oranları**: 1X2, Alt/Üst 2.5, Karşılıklı Gol (KG), İlk Yarı (İY), Skor tahminleri. Yüzde olasılıklar ve ondalık oranlar.
- **Maç Detay**: Canlı istatistikler (topla oynama, şut, korner...), olay zaman çizelgesi, kenar panelinde tam iddaa oranları.
- **Puan Tablosu**: 11 ligde gerçek ESPN verisiyle sıralama. Lig logolarıyla gezinme.

## User preferences

_Kullanıcı dil tercihi: Türkçe_

## Gotchas

- `pnpm run dev` root'ta çalıştırılmaz — workflow'lar üzerinden yönetilir.
- OpenAPI spec değişince mutlaka `pnpm --filter @workspace/api-spec run codegen` çalıştır.
- Orval üretilen hook'larda `enabled` kullanmak için `queryKey` de belirtmek gerekir (TanStack Query v5).
- ESPN standings için `apis/v2/` prefix kullan, `apis/site/v2/` DEĞİL.
- `FOOTBALL_API_KEY` secret var ama api-sports.io hesabı askıya alınmış — kullanma.

## Pointers

- Pnpm workspace yapısı için `pnpm-workspace` skill'ine bak.
- OpenAPI/codegen için `.local/skills/pnpm-workspace/references/openapi.md` bak.
