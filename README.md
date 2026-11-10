# Jumbo Travel: website revamp and admin portal

The new public website for **jumbotravels.com**, plus a restricted admin portal. The client can manage packages, prices, descriptions and images without a developer.

- **Public site:** home, holiday packages list, package detail pages and a 404 page. Fully responsive, with an animated logo and scroll animations, in the existing brand colours.
- **Admin portal:** `/admin`
  - Packages: add, edit, delete, reorder, feature on the homepage, show or hide
  - Package photos: upload several, reorder, choose the cover, remove
  - Flight and hotel deals: prices, notes, images
  - Homepage banner photos
  - Homepage headline, about text, contact details, WhatsApp and social links
- **Not editable:** layout, design and page structure stay with the dev team.
- **Booking:** the Flights, Hotels, Flight + Hotel, Activities, Transfers and Disneyland search tabs link to the client's existing booking engine (`https://www.jumbotravels.com/en?searchTab=…`).

## Run locally
```bash
cp .env.example .env            # optional
ADMIN_PASSWORD=yourpass npm start
# site  → http://localhost:3000
# admin → http://localhost:3000/admin   (user: admin)
```
Requires Node 18 or later. There are **no npm dependencies**: the server uses only Node's built-in modules.

## How content works
- `data/seed.json` holds the starting content, taken from the current site.
- On the first run it is copied to `data/content.json`, and all admin edits are saved there.
- Uploaded images go to `uploads/`.
- Both are git-ignored, so live content is never overwritten by a deploy.

## Deploy (Render)
`render.yaml` sets up a web service with a persistent disk at `/var/data` for content and uploads. Set `ADMIN_PASSWORD` in the Render dashboard.

## Structure
```
server.js          API, auth, image uploads, static files
data/seed.json     starting content
public/            website (HTML, CSS, vanilla JS, brand images, fonts)
admin/             admin portal
uploads/           admin-uploaded images (runtime)
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
