# AGENTS.md — Image to ICO Converter (PNG2ICO Web)

Instructions for AI assistants working on this repository. The global rules in `/root/.config/opencode/AGENTS.md` still apply and take precedence, including explicit confirmation before changing files, services, nginx, or deployments.

## What this project is

A static single-page app that converts images to ICO **entirely in the browser**. There is no backend, no upload, and no telemetry: user files never leave the client. This is a product requirement, not an implementation detail. Do not add server-side conversion, analytics, or remote assets without an explicit request.

- **Stack:** Vite 5, React 18, TypeScript, Tailwind CSS 3, shadcn/ui (Radix), React Router, Vitest.
- **Origin:** scaffolded from a shadcn/ui + Vite template; no vendor tagging tooling remains.
- **Language:** all repository files, documentation, comments, and UI copy are in English. Keep them that way.
- **Live site:** `https://png2ico.pulcitopi.qzz.io`

## Structure

```
src/
  pages/Index.tsx            # Main flow: upload -> preview -> sizes -> convert -> download
  pages/NotFound.tsx
  App.tsx                    # Router, providers, toasts
  components/
    FileUpload.tsx           # Drag & drop and file picker, validates supported formats
    ImagePreview.tsx         # 200 px preview with transparency checkerboard
    SizeSelector.tsx         # Auto or manual selection (16-256)
    ConvertedIcon.tsx        # Result card and blob download
    ui/                      # Generated shadcn/ui components
  utils/
    imageFormats.ts          # Format registry, MIME/extension detection, accept attribute
    icoConverter.ts          # Image loading, SVG normalization, canvas rendering, ICO encoder
  test/                      # Vitest setup and tests
public/                      # robots.txt, placeholder.svg
.github/workflows/build.yml  # Release workflow (published release) -> zip attached to the release
.github/dependabot.yml       # Weekly npm and GitHub Actions updates
```

Import alias: `@/` maps to `src/` in Vite, Vitest, and TypeScript.

## Supported input formats

`src/utils/imageFormats.ts` is the single source of truth. Current list: PNG, JPEG (`.jpg/.jpeg/.jpe/.jfif`), WebP, AVIF, JPEG XL, GIF, BMP, SVG.

Rules:

- Decoding is delegated to the browser via `HTMLImageElement`. Do not add a WASM decoder unless explicitly requested.
- MIME types can be empty or generic; always fall back to the file extension.
- JPEG XL is decoded natively by Chrome 155+, Firefox 158+, and Safari 17+. Edge and older browsers must show the clear decode error from `icoConverter.ts`; never silently fail.
- Animated GIF/WebP/AVIF use the first frame. Do not claim animation support.
- TIFF, HEIC/HEIF, and RAW are intentionally unsupported.
- SVG handling: parse the root `width`/`height`/`viewBox`, normalize the intrinsic size, then load the SVG through `<img>`. Keep it in an image context so scripts never execute. Never inject user SVG markup into the DOM.
- SVG sources are vector: `getEffectiveSizes` receives `Infinity`, so all sizes are available regardless of the SVG's intrinsic dimensions, and each size is rasterized directly.

## ICO format constraints

`createIcoBlob` writes an ICO with a **PNG payload** per size (supported by Windows Vista and later):

- 6-byte header: reserved = 0, type = 1, image count, all little-endian.
- 16-byte directory entry per image: width/height `0` means **256**, planes = 1, bits per pixel = 32, payload size and offset.
- Entries are ordered largest first.
- Raster sources: sizes are limited to the source's smaller dimension; manual selections are filtered the same way. No valid size means an explicit error (minimum 16×16).
- Vector sources: every size is allowed and rendered natively.
- Non-square images: scale proportionally and center on a transparent canvas. Do not crop or add an opaque background.

If you change the encoder, verify with a real `.ico` (for example `file icon.ico`, plus opening it as a favicon or desktop icon) and keep multi-size compatibility.

## Commands

Node.js is **not installed on this server**; only Docker is available. Do not assume `npm` exists on the host.

```sh
# Build and verify through Docker (requires confirmation before pulling images)
docker run --rm -v "$PWD":/app -w /app node:20-alpine sh -c "npm ci && npm run typecheck && npm test && npm run build"
```

| Command | Effect |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` (**Vite only, no type checking**) |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint 9 flat config |
| `npm run typecheck` | `tsc -p tsconfig.app.json --noEmit` |
| `npm test` | Vitest run (jsdom) |

A green `vite build` does **not** prove the code type-checks. Run `npm run typecheck` before declaring changes to props or component APIs complete.

## Tests

- Environment: jsdom; `src/test/setup.ts` provides `matchMedia` and jest-dom.
- jsdom does not implement canvas 2D. Test pure logic (format detection, size selection) directly; mock `HTMLCanvasElement.getContext` and `toDataURL` if the encoder must be tested.
- Do not delete existing tests without replacing them with equivalent coverage.

## Deployment

- nginx: `/etc/nginx/conf.d/pulcitopi.qzz.io.conf`, server `png2ico.pulcitopi.qzz.io`.
- Document root: `/usr/share/nginx/html/png2ico` (owner `nginx:nginx`), SPA fallback `try_files $uri $uri/ /index.html`.
- Flow: `npm run typecheck && npm run build`, then copy the **contents** of `dist/` into the document root. Do not copy `dist/` as a subdirectory.
- Back up the previous release with a timestamp and preserve `nginx:nginx` ownership on the document root.
- `base: '/'` in `vite.config.ts` matches the subdomain root; change it only if the deploy path changes.
- Never modify nginx, certificates, or the document root without explicit confirmation and a timestamped backup.
- After a deploy, verify: index and assets load, no console errors, conversion and download work for at least one raster format and one SVG.

## Conventions

- TypeScript is intentionally non-strict (`strict: false`, unused checks off). Do not tighten the global config; avoid unnecessary `any` in new code.
- Functional React components with typed props. Use Tailwind classes and the CSS tokens from `src/index.css` and `tailwind.config.ts` (`bg-surface`, `text-muted-foreground`, `glass-card`, `btn-primary-glow`). Do not hardcode colors.
- `src/components/ui/*` are generated shadcn/ui files. Prefer composition and local wrappers; if regeneration is needed, use the shadcn CLI with `components.json`.
- Avoid new dependencies for trivial operations. The bundle must stay small and the site static.
- Keep commits small and focused. Never commit `dist/`, `node_modules/`, `.env`, or secrets. Do not push or force-push without confirmation.

## Known gaps (do not fix without a request)

1. `index.html` has no favicon or social preview image; only `placeholder.svg` exists in `public/`.
2. The GitHub Actions workflow runs only when a release is published and attaches a `dist/` zip to that release; there is no automatic deployment to nginx.
3. There is no automated browser test for the canvas-based conversion pipeline.

## Verification checklist

Before reporting a change as complete:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. Manual flow: upload a PNG/JPEG/WebP, convert, download, reopen the ICO; repeat with an SVG; confirm the result card and download work.
