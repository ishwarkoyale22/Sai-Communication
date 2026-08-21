# Sai Communication — Mobile Shop Catalogue & Enquiry Website

A premium catalogue + enquiry website for a local mobile phone shop. Customers browse
products online (live stock and prices) and buy in store. No checkout, no payments.

## Tech

- **Frontend:** React 19 + TanStack Start (file-based routing, SSR) + Tailwind CSS v4
- **Backend:** TanStack server functions (runs inside the same app — no separate Express server to start)
- **Database:** Lovable Cloud (managed Postgres) with tables `products`, `enquiries`, `settings`
- **Admin auth:** a single `ADMIN_PASSWORD` secret checked server-side

## Install & run

```bash
npm install      # or bun install
npm run dev      # http://localhost:8080
npm run build    # production build
```

## Configuration

Database credentials are injected automatically by Lovable Cloud. The only value you set
yourself is the admin password (see `.env.example`):

```
ADMIN_PASSWORD=your-strong-password
```

In Lovable, add it as a secret named `ADMIN_PASSWORD`. Until it is set, `/admin` will
refuse every login.

## Pages

| Route       | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| `/`         | Hero, featured products, why choose us, brands, reviews, map   |
| `/products` | Category tabs, brand filter, price slider, live search, modals |
| `/services` | Sales, repairs, screen/battery replacement, accessories, EMI   |
| `/about`    | Story, mission, shop photo, trust badges                       |
| `/contact`  | Enquiry form, map, click-to-call, WhatsApp, business hours     |
| `/admin`    | Password-protected dashboard                                   |

## Admin panel (`/admin`)

- **Dashboard:** total products, today's enquiries, new enquiries badge
- **Products:** add / edit / delete, inline price and quantity editing, one-click stock and
  featured toggles
- **Enquiries (customer database):** filter by status and date range, open a row for full
  details, move New → Contacted → Closed, export CSV
- **Settings:** shop name, tagline, address, phone, WhatsApp, Google Maps embed, hours,
  social links, trust-badge numbers

## How to add a product

1. Open `/admin` and sign in with the admin password.
2. Products tab → **Add New Product**.
3. Fill name, brand, category, price, original price, stock status and quantity.
4. Specs: one per line as `Label: Value` (e.g. `RAM: 8 GB`).
5. Images: one image URL per line (first one is the card image).
6. Toggle **Featured on homepage** to show it in the homepage strip, then **Save Product**.

Stock status and prices shown on the website always come straight from the database — no
HTML editing is ever needed.
