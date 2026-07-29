/* =========================================================
   Roy Xu — gallery interactions
   ========================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---- footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- intro loader: lift once loaded (with hard fallback) ---- */
  var shownPage = false;
  function showPage() { if (!shownPage) { shownPage = true; document.body.classList.add("loaded"); } }
  if (document.readyState === "complete") showPage();
  else { window.addEventListener("load", showPage); setTimeout(showPage, 1500); }

  /* ---- scroll progress + nav show/hide ---- */
  var bar = document.querySelector(".progress__bar");
  var nav = document.getElementById("nav");
  var heroInner = document.querySelector(".hero__inner");
  var heroCanvasEl = document.querySelector(".hero__canvas");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + "%";
    if (nav) {
      nav.classList.toggle("scrolled", y > 24);
      if (y > 560 && y > lastY + 6) nav.classList.add("hide");
      else if (y < lastY - 6) nav.classList.remove("hide");
    }
    // gentle hero parallax as you scroll away
    if (!reduce && y < 900) {
      if (heroInner) heroInner.style.opacity = Math.max(0, 1 - y / 560);
      if (heroCanvasEl) heroCanvasEl.style.transform = "translateY(" + (y * 0.25) + "px)";
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---- reveal on scroll ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- scroll-spy: highlight the section under the viewport center ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  if ("IntersectionObserver" in window && navLinks.length) {
    var spySections = ["about", "work", "contact"]
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    spySections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- hero glow parallax ---- */
  var glow1 = document.querySelector(".bg__glow--1");
  var glow2 = document.querySelector(".bg__glow--2");
  if (!reduce && glow1 && glow2 && finePointer) {
    var gpx = 0, gpy = 0, gtx = 0, gty = 0, grafing = false;
    function gloop() {
      gtx += (gpx - gtx) * 0.06; gty += (gpy - gty) * 0.06;
      glow1.style.transform = "translate3d(" + (gtx * 30) + "px," + (gty * 30) + "px,0)";
      glow2.style.transform = "translate3d(" + (-gtx * 24) + "px," + (-gty * 24) + "px,0)";
      if (Math.abs(gpx - gtx) > 0.001 || Math.abs(gpy - gty) > 0.001) requestAnimationFrame(gloop);
      else grafing = false;
    }
    window.addEventListener("mousemove", function (e) {
      gpx = e.clientX / window.innerWidth - 0.5;
      gpy = e.clientY / window.innerHeight - 0.5;
      if (!grafing) { grafing = true; requestAnimationFrame(gloop); }
    }, { passive: true });
  }

  /* ---- hero particle field ---- */
  (function heroCanvas() {
    var canvas = document.querySelector(".hero__canvas");
    if (!canvas || reduce) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, particles = [], mouse = { x: -9999, y: -9999 }, running = false, raf = 0;

    // soft dot sprite (pre-rendered once)
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    var sctx = sprite.getContext("2d");
    var g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,247,235,1)");
    g.addColorStop(0.3, "rgba(255,240,220,0.5)");
    g.addColorStop(1, "rgba(255,240,220,0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 64, 64);

    function size() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      var count = Math.min(90, Math.max(24, Math.round((w * h) / 18000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          s: 8 + Math.random() * 24,
          a: 0.04 + Math.random() * 0.14
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        // gentle repel from cursor
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 19000) {
          var d = Math.sqrt(d2) || 1;
          var f = (1 - d / 138) * 1.4;
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }
        // wrap
        if (p.x < -40) p.x = w + 40; else if (p.x > w + 40) p.x = -40;
        if (p.y < -40) p.y = h + 40; else if (p.y > h + 40) p.y = -40;
        ctx.globalAlpha = p.a;
        ctx.drawImage(sprite, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    window.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    window.addEventListener("mouseout", function () { mouse.x = mouse.y = -9999; }, { passive: true });

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 200); }, { passive: true });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

    // pause when hero scrolled away
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0 }).observe(canvas);
    }
    size();
    start();
  })();

  /* ---- custom cursor ---- */
  var cursorEnabled = finePointer && !reduce;
  var ring = document.querySelector(".cursor-ring");
  var dot = document.querySelector(".cursor-dot");
  if (cursorEnabled && ring && dot) {
    document.body.classList.add("has-cursor");
    ring.style.opacity = dot.style.opacity = "0"; // hidden until first move
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, crafing = false, shown = false;
    function cloop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) requestAnimationFrame(cloop);
      else crafing = false;
    }
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      if (!shown) { shown = true; ring.style.opacity = dot.style.opacity = ""; }
      if (!crafing) { crafing = true; requestAnimationFrame(cloop); }
    }, { passive: true });
    document.addEventListener("mouseleave", function () { ring.style.opacity = dot.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { ring.style.opacity = dot.style.opacity = ""; });

    document.addEventListener("mouseover", function (e) {
      var art = e.target.closest && e.target.closest(".art__open");
      var link = e.target.closest && e.target.closest("a, button");
      if (art) { ring.classList.add("is-hover", "show-label"); }
      else if (link) { ring.classList.add("is-hover"); ring.classList.remove("show-label"); }
    });
    document.addEventListener("mouseout", function (e) {
      var art = e.target.closest && e.target.closest(".art__open");
      var link = e.target.closest && e.target.closest("a, button");
      if (art || link) { ring.classList.remove("is-hover", "show-label"); }
    });
  }

  /* ---- 3D tilt on artwork (desktop only; skip the full-bleed feature) ---- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".art:not(.art--feature) .art__open").forEach(function (btn) {
      var MAX = 6;
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        btn.style.transform = "translateY(-6px) rotateX(" + (-py * MAX) + "deg) rotateY(" + (px * MAX) + "deg)";
      });
      btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---- magnetic links ---- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".nav__links a, .contact__links a, .hero__scroll").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (dx * 0.28) + "px," + (dy * 0.28) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- gallery focus dim ---- */
  var galleryEl = document.querySelector(".gallery");
  if (galleryEl && finePointer) {
    var arts = Array.prototype.slice.call(galleryEl.querySelectorAll(".art"));
    galleryEl.addEventListener("mouseover", function (e) {
      var a = e.target.closest && e.target.closest(".art");
      if (!a) return;
      galleryEl.classList.add("is-focusing");
      arts.forEach(function (x) { x.classList.toggle("is-focused", x === a); });
    });
    galleryEl.addEventListener("mouseleave", function () {
      galleryEl.classList.remove("is-focusing");
      arts.forEach(function (x) { x.classList.remove("is-focused"); });
    });
  }

  /* ---- lightbox ---- */
  var figures = Array.prototype.slice.call(document.querySelectorAll("[data-full]"));
  var items = figures.map(function (f) {
    return {
      full: f.getAttribute("data-full"),
      title: f.getAttribute("data-title") || "",
      medium: f.getAttribute("data-medium") || "",
      alt: (f.querySelector("img") && f.querySelector("img").getAttribute("alt")) || ""
    };
  });

  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector(".lb__img");
  var lbT = lb.querySelector(".lb__t");
  var lbM = lb.querySelector(".lb__m");
  var lbCount = lb.querySelector(".lb__count");
  var lbHint = lb.querySelector(".lb__hint");
  var btnClose = lb.querySelector(".lb__close");
  var btnPrev = lb.querySelector(".lb__nav--prev");
  var btnNext = lb.querySelector(".lb__nav--next");
  var current = 0, lastFocused = null;
  var backdropEls = [nav, document.getElementById("top"), document.querySelector(".foot")];

  function setBackgroundInert(on) {
    backdropEls.forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute("aria-hidden", "true"); el.inert = true; }
      else { el.removeAttribute("aria-hidden"); el.inert = false; }
    });
  }

  function preload(i) { if (i >= 0 && i < items.length) { var im = new Image(); im.src = items[i].full; } }

  function unzoom() {
    lbImg.classList.remove("is-zoomed");
    lbImg.style.transform = "";
    lbImg.style.transformOrigin = "center";
    if (lbHint) lbHint.textContent = "click image to zoom";
  }
  function render(i) {
    var it = items[i];
    unzoom();
    lbImg.src = it.full; lbImg.alt = it.alt;
    lbT.textContent = it.title; lbM.textContent = it.medium;
    lbCount.textContent = (i + 1) + " / " + items.length;
    current = i;
    preload(i + 1); preload(i - 1);
  }
  function openLB(i) {
    lastFocused = document.activeElement;
    render(i);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setBackgroundInert(true);
    if (cursorEnabled) { document.body.classList.remove("has-cursor"); if (ring) ring.style.display = "none"; if (dot) dot.style.display = "none"; }
    btnClose.focus();
  }
  function closeLB() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setBackgroundInert(false);
    unzoom();
    if (cursorEnabled) { document.body.classList.add("has-cursor"); if (ring) ring.style.display = ""; if (dot) dot.style.display = ""; }
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function go(dir) { render((current + dir + items.length) % items.length); }

  figures.forEach(function (f, i) {
    var btn = f.querySelector(".art__open");
    if (btn) btn.addEventListener("click", function () { openLB(i); });
  });
  btnClose.addEventListener("click", closeLB);
  btnPrev.addEventListener("click", function () { go(-1); });
  btnNext.addEventListener("click", function () { go(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLB(); });

  /* zoom + pan */
  function setOrigin(e) {
    var r = lbImg.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    lbImg.style.transformOrigin = x + "% " + y + "%";
  }
  lbImg.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!lbImg.classList.contains("is-zoomed")) {
      setOrigin(e);
      lbImg.classList.add("is-zoomed");
      lbImg.style.transform = "scale(2.3)";
      if (lbHint) lbHint.textContent = "click to reset";
    } else { unzoom(); }
  });
  lbImg.addEventListener("mousemove", function (e) { if (lbImg.classList.contains("is-zoomed")) setOrigin(e); });

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLB();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  });

  /* swipe */
  var sx = 0;
  lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
