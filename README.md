# FranticBytes website

Public static site for [FranticBytes](https://www.franticbytes.com), a retro software board. The visitor “dials in,” picks a handle (or guest — no real accounts), and lands on a BBS-style menu. The first product is **Write65**. The catalog is driven by [`products.json`](products.json), so later titles can be added without redesigning the board.

This site is meant to be served at **https://www.franticbytes.com**. The apex domain `franticbytes.com` is not assumed to work while DNS stays at Microsoft 365.

## Stack

Plain HTML, CSS, and vanilla JavaScript. **No build step.** Cloudflare Pages can publish the repo root as-is.

## Cloudflare Pages settings

When you connect this GitHub repo (`Jase-lab/franticbytes-site`) to Cloudflare Pages:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | **None** |
| Build command | *(leave empty)* |
| Output directory | `/` (repo root; if the dashboard treats a blank field as root, leaving it blank is also fine) |
| Root directory | `/` or blank |

Custom domain: add `www.franticbytes.com` on the Pages project. In Microsoft 365 DNS, create a CNAME from `www` to the project’s `*.pages.dev` hostname (use the exact target Cloudflare shows). Leave the apex (`franticbytes.com`) alone so Microsoft 365 mail records stay put.

`_redirects` will send apex traffic to `www` *if* the apex ever points at this project. Today it cannot, because a bare domain at Microsoft cannot be a CNAME.

## Updating the catalog and builds

1. Drop files into [`downloads/write65/`](downloads/write65/) using the filenames listed in `products.json`.
2. When the version changes, edit `products.json` (`version` and each `filename`). The menu and download list update on the next visit.
3. To add a product later, append an object to the `products` array (and add a matching `downloads/<id>/` folder).
4. Keep each file **under 25 MB** (Cloudflare Pages free per-file limit). See the note in [`downloads/write65/README.md`](downloads/write65/README.md).

The board HEAD-checks a download before starting it. Missing files open a “COMING SOON” dialog instead of a raw 404. A direct visit to a missing `/downloads/...` path uses the same BBS-style 404 page.

Placeholder download files are not committed; only the README lives in that folder until the first drop.

## Local preview

```sh
python3 -m http.server 8080
```

Then open <http://127.0.0.1:8080/>. Add `?skip=1` to jump the handshake, or `#/write65/downloads` to go straight to files.

## Keyboard

| Key | Action |
|---|---|
| Esc / M | Back to Main Menu (or skip the handshake) |
| S | Skip handshake to the main menu |
| W / F / D / A / G | On the main menu: Write65 / Files / Doors / about / goodbye |
| 1–4 | Pick a file in the Files |
| ? | Help |

Buttons and links work with a keyboard, a mouse, or a touch screen. The skip control stays on screen during the handshake. With JavaScript or CSS motion disabled, the catalog and download links are still available.

## Font

[VT323](fonts/vt323/) is included under the SIL Open Font License (see `fonts/vt323/OFL.txt`).
