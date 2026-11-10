# Jumbo Travel: website revamp and admin portal

The new public website for **jumbotravels.com**, plus a restricted admin portal. The client can manage packages, prices, descriptions and images without a developer.

- **Public site:** home, holiday packages list, package detail pages and a 404 page. Fully responsive, with an animated logo and scroll animations, in the existing brand colours.
- **Admin portal:** `/admin` (password-protected)
  - Packages: add, edit, delete, reorder, feature on the homepage, show or hide
  - Package photos: upload several, reorder, choose the cover, remove
  - Flight and hotel deals: prices, notes, images
  - Homepage banner photos
  - Homepage headline, about text, contact details, WhatsApp and social links
- **Not editable:** layout, design and page structure stay with the dev team.
- **Booking:** the Flights, Hotels, Flight + Hotel, Activities, Transfers and Disneyland search tabs link to the client's existing booking engine (`https://www.jumbotravels.com/en?searchTab=…`).

## Run locally
```bash
ADMIN_PASSWORD=yourpass node server.js
# site  → http://localhost:3000
# admin → http://localhost:3000/admin   (user: admin)
```
Requires Node 18 or later. Locally, content is saved to `data/content.json` and uploaded images go to `uploads/`, so `npm install` isn't needed.

## Deploy on Vercel
Vercel functions can't keep files between requests, so in production:
- content (packages, prices, text) is saved in **Upstash Redis**
- uploaded photos go to **Vercel Blob**

The code switches automatically based on environment variables.

1. Push the repo to GitHub, then in Vercel go to **Add New → Project** and import it. The framework preset is **Other**, with no build command needed. The output directory is `public`.
2. In the project, go to **Storage → Create → Upstash (Redis)** and connect it. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Go to **Storage → Create → Blob** and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. In **Settings → Environment Variables**, add:
   - `ADMIN_PASSWORD`: a strong password
   - `SESSION_SECRET`: a long random string
   - `ADMIN_USER`: optional, defaults to `admin`
5. **Redeploy.** On the first visit, Redis is filled from `data/seed.json`.

## Structure
```
api/index.js       Vercel function: every /api/* request
lib/api.js         API logic: auth, packages, deals, banners, site settings, uploads
lib/store.js       storage: Redis + Blob on Vercel, local files in dev
data/seed.json     starting content (taken from the current site)
public/            website (static) + public/admin (admin portal)
server.js          local dev server (mirrors vercel.json routes)
vercel.json        rewrites (/packages/:slug, /api/*), cache headers
```

## Brand
| Colour | Hex |
| --- | --- |
| Navy | `#12154b` |
| Magenta | `#ee1579` |
| Plum | `#87156e` |
| Pink | `#f7498e` |
| Cyan | `#1cade3` |

Font: Lato (Droid Kufi is included for the future Arabic version).

## Notes for v1 review
- Package prices and descriptions in the seed are sample content. The client should replace them from the admin portal.
- Flight and hotel deal prices are copied from the current homepage.
- The newsletter form only shows a confirmation for now. Connect it to the client's mailing tool once confirmed.
- Arabic (RTL) is planned for after the IT manager's review.
