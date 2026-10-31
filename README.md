# royxuhan.github.io

Roy's personal site
hosted on GitHub Pages at https://royxuhan.github.io

## Structure

```
index.html              About, gallery, contact
404.html                Themed not-found page
favicon.svg             RX monogram
assets/
  apple-touch-icon.png  iOS home-screen icon
  fonts/                Self-hosted Fraunces (roman + italic) and Inter,
                        subset to Latin and trimmed to the weights in use
  css/style.css         All styles (design tokens, layout, animations)
  js/main.js            All behavior (ink hero, letter weave, masonry +
                        filters, grid/index views, ambient tone, cursor,
                        scroll-spy, lightbox with per-piece links, reveals)
  img/
    og.jpg              Social share card (1200x630)
    profile.jpg         Headshot master (profile-480/960.webp are generated)
    wash.svg            Ragged watercolour mask used for the reveal
    art/
      full/1..15.jpg    Master scans (source for the WebP files)
      web/              Generated WebP: {id}-400, -640, -1200, -full
tools/
  build-images.mjs      Regenerates the WebP files and prints size + tone per piece
```

## Adding or updating artwork

1. Drop the scan into `assets/img/art/full/` as `{id}.jpg`.
2. Run `npm i --no-save sharp && node tools/build-images.mjs`. It writes the
   WebP files and prints each piece's dimensions and tone (the colour the page
   light shifts to when that piece is on screen).
3. Copy an existing `<li class="gallery__item">` in `index.html` and update the
   paths, `width`/`height`, `data-tone`, `data-tags` (used by the medium
   filters: `graphite`, `charcoal`, `ink`, `watercolor`, `pencil`, `oil`),
   alt text, and caption. Add `gallery__item--wide` to the `<li>` for a
   panorama that should span the full width of the grid.

## Years

Each caption's year lives in `<span class="art__y">2016</span>` and shows in
both the gallery and the lightbox. Leave it empty to hide it. If the range
changes, update the "2015–2017" in the hero too.

## Local preview

```
python3 -m http.server 8000
# open http://localhost:8000
```
