# Gjeje personin për problemin tënd në qytetin tënd

A directory site covering Kosovo, Albania, North Macedonia, and the Presheva
Valley (Serbia): a place where local tradespeople — electricians, plumbers,
tilers, gardeners, cleaners, and other trades — can list their name, city,
and phone number, so that people from the diaspora (and neighbors) know
exactly who to call when something needs fixing at home.

No accounts, no app store, no gatekeeping — just a public list per trade, and a
form to add yourself to it. The homepage is an interactive map (click a city,
see its trade categories); there's also a plain grouped list underneath for
anyone who can't use the map.

## Stack

Deliberately minimal so it's cheap to run and easy for someone else to maintain:

- Node.js + [Express](https://expressjs.com/) for the server
- [EJS](https://ejs.co/) templates, no frontend framework/build step
- [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles for the homepage map
  (free, no API key needed) — loaded from a CDN, no build step
- Listings stored in `data/listings.json` (no database server to run or pay for)
- `express-rate-limit` + a honeypot field on the submission form to cut down on spam

### A note on the city data

`config/cities.js` lists all 38 Kosovo, 61 Albania, and 80 North Macedonia
municipalities (official counts), plus the 3 Presheva Valley municipalities
this project started with. Coordinates are best-effort approximations of each
municipality's main town — good enough to place a pin on a country-level map,
not surveyed data. If a pin looks wrong, fix its `lat`/`lng` in that file.

## Running locally

```bash
npm install
cp .env.example .env   # then edit ADMIN_USER / ADMIN_PASS
npm start
```

Visit http://localhost:3000.

## Pages

- `/` — map (+ fallback list) to pick your city
- `/qyteti/:citySlug` — trade categories for that city, with counts
- `/qyteti/:citySlug/kategoria/:catSlug` — listings for one trade in that city
- `/shto` — form to add yourself (pick city + trade)
- `/admin` — password-protected (HTTP Basic Auth via `ADMIN_USER`/`ADMIN_PASS`
  in `.env`) table of every listing, with delete, for removing spam or
  outdated entries

## Adding a new trade category, city, or country

Edit `config/categories.js`, `config/cities.js`, or `config/countries.js` —
every other page (map, dropdowns, routes) picks the list up automatically.
City slugs are generated from the label, so just add `{ label, country, lat, lng }`.

## Deploying

This is a plain Node process (`npm start`), so it runs on any host that can
run Node: a small VPS, Render, Railway, Fly.io, etc. The one thing to get
right: **`data/listings.json` must live on persistent/writable storage** that
survives restarts and redeploys — on platforms with an ephemeral filesystem,
mount a persistent volume and point the app at it, or the list will reset
every time you deploy. Set real values for `ADMIN_USER`/`ADMIN_PASS` before
going live.
