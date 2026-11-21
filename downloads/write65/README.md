# Write65 download drops

Drop release files in this folder using the exact filenames in `/products.json`.

Current expected files for **v0.8.0**:

| Platform | Filename |
|---|---|
| MEGA65 | `write65-0.8.0.d81` |
| macOS | `Write65-0.8.0-macos.zip` |
| Windows | `Write65-0.8.0-windows.zip` |
| Linux | `Write65-0.8.0-x86_64.AppImage` |

When you ship a new version:

1. Put the new files in this folder.
2. Update `version` and each `filename` (and notes, if needed) in `/products.json`.
3. You can delete or keep older files; the site only links what `products.json` lists.

The website checks each link before starting a download. If a file is missing, visitors see a FranticBytes “COMING SOON” notice instead of a raw 404.

## Cloudflare size limit

Cloudflare Pages on the free plan rejects **individual files larger than 25 MB**. Keep every drop under that cap.

Typical Write65 builds should be well under it (the MEGA65 `.d81` is 800 KB; the desktop apps are small Rust binaries). If a future product goes over 25 MB, host that file on Cloudflare R2 (or GitHub Releases) and put the public URL in `products.json` later — do not commit a file that large to this repo.
