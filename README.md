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
  css/style.css         All styles (design tokens, layout, animations)
  js/main.js            All behavior (loader, particles, cursor, tilt,
                        scroll-spy, lightbox, reveals)
  img/
    og.jpg              Social share card (1200x630)
    profile.jpg         Headshot
    art/
      thumb/1..15.jpg   Web-optimized gallery thumbnails (lazy-loaded)
      full/1..15.jpg    Larger versions loaded on demand in the lightbox
```

## Local preview

```
python3 -m http.server 8000
# open http://localhost:8000
```
