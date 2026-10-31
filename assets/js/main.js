/* =========================================================
   Roy Xu — gallery interactions
   ========================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var root = document.documentElement;
  var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function now() { return performance.now(); }
  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }

  /* ---- footer year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- split [data-weave] headings into letters ---- */
  $$("[data-weave]").forEach(function (el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text.replace(/\u00a0/g, " "));
    el.textContent = "";
    Array.from(text).forEach(function (c, i) {
      var s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = c;
      el.appendChild(s);
    });
  });

  /* ---- entrance: start as soon as fonts are in (never wait on images) ---- */
  var shownPage = false;
  function showPage() { if (!shownPage) { shownPage = true; document.body.classList.add("loaded"); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(showPage);
  setTimeout(showPage, 700);

  /* ---- scroll progress + nav show/hide + hero fade ---- */
  var bar = $(".progress__bar");
  var nav = document.getElementById("nav");
  var heroInner = $(".hero__inner");
  var heroInk = $(".hero__ink");
  var heroChars = $$(".hero__name .ch");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var docH = root.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (docH > 0 ? y / docH : 0) + ")";
    if (nav) {
      nav.classList.toggle("scrolled", y > 24);
      if (y > 560 && y > lastY + 6) nav.classList.add("hide");
      else if (y < lastY - 6) nav.classList.remove("hide");
    }
    if (!reduce && y < 1200) {
      if (heroInner) heroInner.style.opacity = Math.max(0, 1 - y / 560);
      if (heroInk) heroInk.style.transform = "translateY(" + (y * 0.25) + "px)";
      // leaving the hero, the letters lift and drift apart at their own pace
      var mid = (heroChars.length - 1) / 2;
      heroChars.forEach(function (c, i) {
        c.style.translate = ((i - mid) * y * 0.045).toFixed(1) + "px " + (-y * (0.1 + Math.abs(Math.sin(i * 1.7)) * 0.22)).toFixed(1) + "px";
      });
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---- reveal on scroll ---- */
  var revealEls = $$(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in", "is-washed"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add("in");
        io.unobserve(el);
        // drop the wash mask once it has finished sweeping, so it costs nothing afterwards
        if (el.querySelector("img")) setTimeout(function () { el.classList.add("is-washed"); }, 2100);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- scroll-spy: highlight the section under the viewport center ---- */
  var navLinks = $$(".nav__links a");
  var spyHref = { about: "#about", work: "#work", contact: "#contact" };
  if ("IntersectionObserver" in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === spyHref[en.target.id]);
          });
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    Object.keys(spyHref).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ---- background glow parallax (moves the wrapper; the glows keep drifting) ---- */
  var glows = $(".bg__glows");
  if (!reduce && glows && finePointer) {
    var gpx = 0, gpy = 0, gtx = 0, gty = 0, grafing = false;
    var gloop = function () {
      gtx += (gpx - gtx) * 0.05; gty += (gpy - gty) * 0.05;
      glows.style.transform = "translate3d(" + (gtx * 40) + "px," + (gty * 40) + "px,0)";
      if (Math.abs(gpx - gtx) > 0.001 || Math.abs(gpy - gty) > 0.001) requestAnimationFrame(gloop);
      else grafing = false;
    };
    window.addEventListener("mousemove", function (e) {
      gpx = e.clientX / window.innerWidth - 0.5;
      gpy = e.clientY / window.innerHeight - 0.5;
      if (!grafing) { grafing = true; requestAnimationFrame(gloop); }
    }, { passive: true });
  }

  /* ---- ambient tone: the page light takes on the colour of the piece in view ---- */
  var DEFAULT_TONE = "#c98a6a";
  function glowTone(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    s = clamp(s * 1.9 + 0.1, 0, 0.72);
    l = clamp(l, 0.5, 0.64);
    return "hsl(" + h.toFixed(0) + " " + (s * 100).toFixed(0) + "% " + (l * 100).toFixed(0) + "%)";
  }
  function setTone(hex) { root.style.setProperty("--tone", hex ? glowTone(hex) : DEFAULT_TONE); }
  if ("IntersectionObserver" in window) {
    var ratios = new Map();
    var toneIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
      var best = null, bestR = 0.15;
      ratios.forEach(function (r, el) { if (r > bestR && !el.closest(".is-out")) { bestR = r; best = el; } });
      if (!lbOpen) setTone(best ? best.getAttribute("data-tone") : null);
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9] });
    $$("[data-tone]").forEach(function (el) { toneIO.observe(el); });
  }

  /* =========================================================
     Hero: watercolour ink that blooms under the pointer (WebGL2)
     ========================================================= */
  var VERT = [
    "#version 300 es",
    "out vec2 uv;",
    "void main() {",
    "  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
    "  uv = p;",
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var SIM = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 uv; out vec4 o;",
    "uniform sampler2D prev;",
    "uniform vec2 texel;",
    "uniform float aspect, time, dt, floorCut;",
    "uniform vec4 seg[8];",
    "uniform vec4 pig[8];",
    "uniform float rad[8];",
    "uniform int count;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);",
    "}",
    "float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }",
    "vec2 curl(vec2 p) {",
    "  float e = 0.05;",
    "  float dx = fbm(p + vec2(e, 0)) - fbm(p - vec2(e, 0));",
    "  float dy = fbm(p + vec2(0, e)) - fbm(p - vec2(0, e));",
    "  return vec2(dy, -dx) / (2.0 * e);",
    "}",
    "float segDist(vec2 p, vec2 a, vec2 b) {",
    "  vec2 pa = p - a, ba = b - a;",
    "  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);",
    "  return length(pa - ba * h);",
    "}",
    "void main() {",
    "  vec2 asp = vec2(aspect, 1.0);",
    "  vec2 flow = curl(uv * asp * 1.6 + vec2(time * 0.012, -time * 0.02));",
    "  flow += 0.6 * curl(uv * asp * 4.5 - vec2(0.0, time * 0.05));",
    "  vec2 src = uv - flow * texel * 0.55 * dt;",
    "  vec4 c = texture(prev, src);",
    "  vec4 n = texture(prev, src + vec2(texel.x, 0.0)) + texture(prev, src - vec2(texel.x, 0.0))",
    "         + texture(prev, src + vec2(0.0, texel.y)) + texture(prev, src - vec2(0.0, texel.y));",
    "  c = mix(c, n * 0.25, 0.12 * dt);",
    "  c = max(c * pow(0.9955, dt) - floorCut, 0.0);",
    "  for (int i = 0; i < 8; i++) {",
    "    if (i >= count) break;",
    "    float d = segDist(uv * asp, seg[i].xy * asp, seg[i].zw * asp);",
    "    float r = rad[i];",
    "    float wobble = 0.75 + 0.5 * noise(uv * asp * 38.0 + float(i) * 7.0);",
    "    c.rgb += pig[i].rgb * pig[i].a * exp(-d * d / (r * r)) * wobble;",
    "  }",
    "  o = min(c, vec4(2.5));",
    "}"
  ].join("\n");

  var SHOW = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 uv; out vec4 o;",
    "uniform sampler2D ink;",
    "uniform vec2 texel;",
    "uniform float time;",
    "uniform vec3 c1, c2, c3;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
    "void main() {",
    "  vec3 p = texture(ink, uv).rgb;",
    "  vec3 gx = texture(ink, uv + vec2(texel.x, 0.0)).rgb - texture(ink, uv - vec2(texel.x, 0.0)).rgb;",
    "  vec3 gy = texture(ink, uv + vec2(0.0, texel.y)).rgb - texture(ink, uv - vec2(0.0, texel.y)).rgb;",
    "  float edge = length(gx) + length(gy);",
    "  float d = p.r + p.g + p.b;",
    "  vec3 col = 1.0 - exp(-(c1 * p.r + c2 * p.g + c3 * p.b) * 1.6);",
    // pigment pools at the rim of each wash, like watercolour drying on paper
    "  col *= 0.85 + clamp(edge * 4.0, 0.0, 0.8);",
    "  col = min(col, vec3(0.95));",
    "  float grain = hash(floor(gl_FragCoord.xy) + fract(time) * 91.0) - 0.5;",
    "  col += grain * 0.05 * smoothstep(0.0, 0.25, d);",
    "  float a = clamp(d * 0.5, 0.0, 0.7);",
    "  o = vec4(col * 0.92, a * 0.45);",
    "}"
  ].join("\n");

  function heroInkSetup() {
    var canvas = heroInk;
    if (!canvas || reduce) return;
    var gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
      return s;
    }
    function program(fs) {
      var p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) {
        var name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, "");
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p: p, u: u };
    }
    var sim, show;
    try { sim = program(SIM); show = program(SHOW); } catch (err) { return; }

    var halfFloat = !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    var tex = [], fbo = [], cur = 0, simW = 0, simH = 0, w = 0, h = 0, floorCut = 0.0004;

    function target(width, height, useHalf) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (useHalf) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      return ok ? { t: t, f: f } : null;
    }
    // quality steps down on slow devices: [max pixel ratio, sim cell size in CSS px]
    var LEVELS = [[1.5, 3], [1, 4.5]], level = 0;
    function size() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, LEVELS[level][0]);
      var nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
      var nsw = Math.max(64, Math.min(520, Math.round(r.width / LEVELS[level][1])));
      if (nw === w && nh === h && nsw === simW) return;
      w = canvas.width = nw; h = canvas.height = nh;
      simW = nsw;
      simH = Math.max(64, Math.round(simW * r.height / r.width));
      tex.forEach(function (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); });
      var a = target(simW, simH, halfFloat), b = a && target(simW, simH, halfFloat);
      if (!a || !b) { halfFloat = false; a = target(simW, simH, false); b = target(simW, simH, false); }
      floorCut = halfFloat ? 0.0004 : 0.0025;
      tex = [a, b]; fbo = tex; cur = 0;
    }

    /* strokes queued from the pointer and the ambient brushes */
    var queue = [];
    var PIGMENTS = [[1, 0.15, 0], [0.15, 1, 0], [0, 0.2, 1]];
    function pigment(t) {
      var k = (t % 3 + 3) % 3, i = Math.floor(k), f = k - i;
      var a = PIGMENTS[i], b = PIGMENTS[(i + 1) % 3];
      f = f * f * (3 - 2 * f);
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    }
    function stroke(ax, ay, bx, by, strength, radius, hueT) {
      if (queue.length >= 8) queue.shift();
      var p = pigment(hueT);
      queue.push({ s: [ax, ay, bx, by], p: [p[0], p[1], p[2], strength], r: radius });
    }

    var aspect = 1, start = now(), last = start, running = false, raf = 0, painted = 0, bloomed = false;
    var hint = $(".hero__hint"), hintText = $(".hero__hint-text");
    if (hintText && !finePointer) hintText.textContent = "Touch to paint";
    var ptr = { x: 0, y: 0, has: false, t: 0 };

    function feed(cx, cy) {
      var r = canvas.getBoundingClientRect();
      if (cy < r.top || cy > r.bottom || cx < r.left || cx > r.right) { ptr.has = false; return; }
      var x = (cx - r.left) / r.width, y = 1 - (cy - r.top) / r.height;
      if (ptr.has) {
        var dx = (x - ptr.x) * aspect, dy = y - ptr.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.0008) {
          var t = (now() - start) / 1000;
          stroke(ptr.x, ptr.y, x, y, clamp(dist * 9, 0.05, 0.5), clamp(0.022 + dist * 0.35, 0.022, 0.06), t * 0.18);
          painted += dist;
          if (hint && painted > 0.8) hint.classList.add("is-done");
        }
      }
      ptr.x = x; ptr.y = y; ptr.has = true; ptr.t = now();
      start_();
    }
    window.addEventListener("pointermove", function (e) { feed(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener("touchmove", function (e) { if (e.touches[0]) feed(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener("touchend", function () { ptr.has = false; }, { passive: true });
    document.addEventListener("mouseleave", function () { ptr.has = false; });

    /* three slow brushes keep the page alive when nobody is touching it */
    var brushes = [0, 1, 2].map(function (i) { return { i: i, x: 0, y: 0, has: false }; });
    function brushPos(b, t) {
      var k = b.i * 2.1;
      return [
        0.5 + 0.42 * Math.sin(t * (0.11 + b.i * 0.023) + k) * Math.cos(t * 0.05 + k * 0.7),
        0.5 + 0.38 * Math.sin(t * (0.083 + b.i * 0.017) + k * 1.3)
      ];
    }

    var slowFrames = 0, sampled = 0;
    function budget(ms, t) {
      if (t < 2.5 || ms > 250) return true;  // skip warm-up and tab/scroll hiccups
      sampled++;
      if (ms > 34) slowFrames++;
      if (sampled < 90) return true;
      var slow = slowFrames / sampled > 0.5;
      sampled = slowFrames = 0;
      if (!slow) return true;
      if (level < LEVELS.length - 1) { level++; size(); return true; }
      canvas.classList.remove("is-live");
      root.classList.remove("ink-ready");
      stop();
      dead = true;
      return false;
    }

    function frame() {
      var tNow = now(), ms = tNow - last, dt = clamp(ms / 16.667, 0.25, 3);
      last = tNow;
      var t = (tNow - start) / 1000;
      if (!budget(ms, t)) return;

      var idle = tNow - ptr.t > 2500;
      brushes.forEach(function (b) {
        var p = brushPos(b, t + 3);
        if (b.has && queue.length < 8) {
          stroke(b.x, b.y, p[0], p[1], (idle ? 0.013 : 0.004) * dt, 0.032, t * 0.06 + b.i);
        }
        b.x = p[0]; b.y = p[1]; b.has = true;
      });
      // opening bloom: a few soft washes spill out from behind the name
      if (!bloomed && t > 0.35) {
        bloomed = true;
        for (var k = 0; k < 5; k++) {
          var a = k / 5 * Math.PI * 2 + 0.4, cx = 0.3 + 0.06 * Math.cos(a), cy = 0.52 + 0.08 * Math.sin(a);
          stroke(cx, cy, cx + 0.09 * Math.cos(a), cy + 0.09 * Math.sin(a), 0.38 * clamp(aspect, 0.55, 1), 0.07, k * 0.6);
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur].f);
      gl.viewport(0, 0, simW, simH);
      gl.useProgram(sim.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[cur].t);
      gl.uniform1i(sim.u.prev, 0);
      gl.uniform2f(sim.u.texel, 1 / simW, 1 / simH);
      gl.uniform1f(sim.u.aspect, aspect);
      gl.uniform1f(sim.u.time, t);
      gl.uniform1f(sim.u.dt, dt);
      gl.uniform1f(sim.u.floorCut, floorCut * dt);
      var segs = new Float32Array(32), pigs = new Float32Array(32), rads = new Float32Array(8);
      queue.forEach(function (q, i) {
        segs.set(q.s, i * 4); pigs.set(q.p, i * 4); rads[i] = q.r;
      });
      gl.uniform4fv(sim.u.seg, segs);
      gl.uniform4fv(sim.u.pig, pigs);
      gl.uniform1fv(sim.u.rad, rads);
      gl.uniform1i(sim.u.count, queue.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      queue.length = 0;
      cur = 1 - cur;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(show.p);
      gl.bindTexture(gl.TEXTURE_2D, tex[cur].t);
      gl.uniform1i(show.u.ink, 0);
      gl.uniform2f(show.u.texel, 1 / simW, 1 / simH);
      gl.uniform1f(show.u.time, t);
      gl.uniform3f(show.u.c1, 0.86, 0.46, 0.3);
      gl.uniform3f(show.u.c2, 0.9, 0.72, 0.46);
      gl.uniform3f(show.u.c3, 0.32, 0.42, 0.95);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (running) raf = requestAnimationFrame(frame);
    }
    var dead = false;
    function start_() { if (!running && !dead && visible && !document.hidden) { running = true; last = now(); raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var visible = true;
    function resize() {
      var r = canvas.getBoundingClientRect();
      aspect = r.width / Math.max(1, r.height);
      size();
    }
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); }, { passive: true });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start_(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { visible = en.isIntersecting; visible ? start_() : stop(); });
      }, { threshold: 0 }).observe(canvas);
    }
    resize();
    root.classList.add("ink-ready");
    canvas.classList.add("is-live");
    start_();
  }
  heroInkSetup();

  /* ---- letters swell and soften under the pointer (variable font axes) ---- */
  function weave(el, base) {
    var chars = $$(".ch", el);
    if (!chars.length) return;
    var state = chars.map(function () { return { w: base, s: 0 }; });
    var mx = -9999, my = -9999, raf = 0, active = false, inView = true;
    function tick() {
      var fs = parseFloat(getComputedStyle(el).fontSize) || 100;
      var R = fs * 0.75, settled = true;
      var rects = chars.map(function (c) { return c.getBoundingClientRect(); });
      chars.forEach(function (c, i) {
        var r = rects[i];
        var dx = mx - (r.left + r.width / 2), dy = (my - (r.top + r.height / 2)) * 1.25;
        var f = Math.exp(-(dx * dx + dy * dy) / (R * R));
        var st = state[i];
        var tw = base + (820 - base) * f, ts = 100 * f;
        st.w = lerp(st.w, tw, 0.14); st.s = lerp(st.s, ts, 0.14);
        if (Math.abs(st.w - tw) > 0.5 || Math.abs(st.s - ts) > 0.5) settled = false;
        c.style.fontVariationSettings = '"opsz" 144, "wght" ' + st.w.toFixed(1) + ', "SOFT" ' + st.s.toFixed(1);
      });
      raf = settled ? 0 : requestAnimationFrame(tick);
    }
    function kick() { if (!raf && inView) raf = requestAnimationFrame(tick); }
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; active = true; kick(); }, { passive: true });
    document.addEventListener("mouseleave", function () { mx = my = -9999; kick(); });
    window.addEventListener("scroll", function () { if (active) kick(); }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (ents) { inView = ents[0].isIntersecting; }).observe(el);
    }
  }
  if (!reduce && finePointer) $$("[data-weave]").forEach(function (el) { weave(el, 380); });

  /* =========================================================
     Gallery: balanced masonry in reading order + medium filters
     ========================================================= */
  var grid = $(".gallery");
  var gridItems = grid ? $$(".gallery__item", grid) : [];
  var filter = "all";
  function matches(it) {
    return filter === "all" || (" " + it.getAttribute("data-tags") + " ").indexOf(" " + filter + " ") >= 0;
  }
  (function masonry() {
    if (!grid || !gridItems.length) return;
    var status = $(".gallery__status");
    var btns = $$(".filters__btn");
    btns.forEach(function (b) {
      var f = b.getAttribute("data-filter");
      var n = f === "all" ? gridItems.length : gridItems.filter(function (it) {
        return (" " + it.getAttribute("data-tags") + " ").indexOf(" " + f + " ") >= 0;
      }).length;
      b.setAttribute("data-count", n);
    });

    grid.classList.add("is-masonry", "is-instant");
    function layout() {
      var W = grid.clientWidth, n = window.innerWidth <= 620 ? 1 : 2;
      var gx = n > 1 ? clamp(W * 0.035, 20, 44) : 0;
      var gy = n > 1 ? clamp(W * 0.045, 28, 52) : clamp(W * 0.1, 40, 52);
      var cw = (W - gx * (n - 1)) / n;
      function wide(it) { return it.classList.contains("gallery__item--wide"); }
      function ratio(it) { var im = $("img", it); return im.getAttribute("height") / im.getAttribute("width"); }
      gridItems.forEach(function (it) { it.style.width = (wide(it) ? W : cw) + "px"; });
      var vis = gridItems.filter(matches);
      var hs = vis.map(function (it) { return it.offsetHeight; });
      var pos = [], y0 = 0, band = [];
      // pieces between full-width ones form a balanced band of columns.
      // With two columns, search every left/right split for the one whose bottoms land closest,
      // without letting a piece sit noticeably higher than the one numbered before it
      function split(items) {
        var m = items.length, best = null, bestScore = Infinity, pick = [];
        if (m > 20) return null;
        (function dfs(k, h0, h1, prevTop, cost) {
          if (cost >= bestScore) return;
          if (k === m) {
            var s = cost + Math.abs(h0 - h1);
            if (s < bestScore) { bestScore = s; best = pick.slice(); }
            return;
          }
          var h = hs[items[k]] + gy;
          for (var c = 0; c < 2; c++) {
            var top = c ? h1 : h0;
            pick[k] = c;
            dfs(k + 1, c ? h0 : h0 + h, c ? h1 + h : h1, top, cost + Math.max(0, prevTop - top - gy) * 6);
          }
        })(0, 0, 0, 0, 0);
        return best;
      }
      function flush() {
        if (!band.length) return;
        var colH = [], cols = [], bottom = y0;
        for (var k = 0; k < n; k++) { colH.push(0); cols.push([]); }
        var chosen = n === 2 ? split(band) : null;
        band.forEach(function (i, j) {
          var c = 0;
          if (chosen) c = chosen[j];
          else for (var k = 1; k < n; k++) if (colH[k] < colH[c] - 1) c = k;
          cols[c].push(i);
          colH[c] += hs[i] + gy;
        });
        // rather than stretching gaps, let the shorter column widen a few percent until the
        // bottoms meet: images grow with their column, captions don't
        var widths = cols.map(function () { return cw; });
        if (n === 2 && cols[0].length && cols[1].length) {
          var A = [0, 0], C = [0, 0];
          cols.forEach(function (list, c) {
            list.forEach(function (i) { var a = ratio(vis[i]); A[c] += a; C[c] += hs[i] - cw * a + gy; });
          });
          widths[0] = clamp((C[1] - C[0] + 2 * cw * A[1]) / (A[0] + A[1]), cw * 0.96, cw * 1.04);
          widths[1] = 2 * cw - widths[0];
          cols.forEach(function (list, c) {
            list.forEach(function (i) { vis[i].style.width = widths[c] + "px"; });
          });
          cols.forEach(function (list, c) {
            colH[c] = 0;
            list.forEach(function (i) { hs[i] = vis[i].offsetHeight; colH[c] += hs[i] + gy; });
          });
        }
        var maxH = Math.max.apply(null, colH);
        cols.forEach(function (list, c) {
          // anything the widths couldn't absorb is shared out between the gaps, but only a little
          var extra = list.length > 1 ? Math.min((maxH - colH[c]) / (list.length - 1), 8) : 0;
          var y = y0, x = c ? widths[0] + gx : 0;
          list.forEach(function (i) { pos[i] = [x, y]; y += hs[i] + gy + extra; });
          if (list.length) bottom = Math.max(bottom, y - gy - extra);
        });
        y0 = bottom + gy;
        band = [];
      }
      vis.forEach(function (it, i) {
        if (wide(it)) { flush(); pos[i] = [0, y0]; y0 += hs[i] + gy; }
        else band.push(i);
      });
      flush();
      var bottom = vis.length ? y0 - gy : 0;
      vis.forEach(function (it, i) {
        it.style.transform = "translate3d(" + pos[i][0].toFixed(1) + "px," + pos[i][1].toFixed(1) + "px,0)";
        it.classList.remove("is-out");
        it.inert = false;
      });
      gridItems.forEach(function (it) {
        if (!matches(it)) { it.classList.add("is-out"); it.inert = true; }
      });
      grid.style.height = bottom + "px";
    }
    function instantLayout() {
      grid.classList.add("is-instant");
      layout();
      requestAnimationFrame(function () { requestAnimationFrame(function () { grid.classList.remove("is-instant"); }); });
    }
    instantLayout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(instantLayout);
    if ("ResizeObserver" in window) {
      var lastW = grid.clientWidth;
      new ResizeObserver(function () {
        if (grid.clientWidth !== lastW) { lastW = grid.clientWidth; instantLayout(); }
      }).observe(grid);
    }

    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-filter");
        var row = b.parentNode;
        if (row.scrollWidth > row.clientWidth) {
          var dx = b.getBoundingClientRect().left - row.getBoundingClientRect().left;
          row.scrollTo({ left: row.scrollLeft + dx - (row.clientWidth - b.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
        }
        btns.forEach(function (x) {
          var on = x === b;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        layout();
        grid.dispatchEvent(new CustomEvent("filterchange"));
        var shown = gridItems.filter(matches).length;
        if (status) status.textContent = "Showing " + shown + (shown === 1 ? " work" : " works") + (filter === "all" ? "" : " in " + b.textContent.trim().toLowerCase());
        var head = $(".work__head");
        if (head && head.getBoundingClientRect().top < -40) head.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
  })();

  /* ---- custom cursor ---- */
  var cursorEnabled = finePointer && !reduce;
  var ring = $(".cursor-ring");
  var dot = $(".cursor-dot");
  if (cursorEnabled && ring && dot) {
    document.body.classList.add("has-cursor");
    ring.style.opacity = dot.style.opacity = "0"; // hidden until first move
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, crafing = false, shown = false;
    var cloop = function () {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) requestAnimationFrame(cloop);
      else crafing = false;
    };
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

  /* ---- magnetic links ---- */
  if (finePointer && !reduce) {
    $$(".nav__links a, .hero__scroll").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (dx * 0.28) + "px," + (dy * 0.28) + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---- copy email to clipboard ---- */
  var copyBtn = $(".contact__copy");
  if (copyBtn) {
    if (!navigator.clipboard) {
      copyBtn.style.display = "none";
    } else {
      var copyTimer;
      copyBtn.addEventListener("click", function () {
        navigator.clipboard.writeText(copyBtn.getAttribute("data-copy") || "").then(function () {
          copyBtn.classList.add("copied");
          copyBtn.setAttribute("aria-label", "Email copied");
          clearTimeout(copyTimer);
          copyTimer = setTimeout(function () {
            copyBtn.classList.remove("copied");
            copyBtn.setAttribute("aria-label", "Copy email address");
          }, 1800);
        }).catch(function () {});
      });
    }
  }

  /* =========================================================
     Lightbox: flies out of the thumbnail; zoom with click, wheel, or pinch
     ========================================================= */
  var lbOpen = false;
  var lb = document.getElementById("lightbox");
  var view = $(".lb__viewport", lb);
  var lbFrame = $(".lb__frame", lb);
  var lbImg = $(".lb__img", lb);
  var lbAmb = $(".lb__ambient", lb);
  var lbBar = $(".lb__bar", lb);
  var lbI = $(".lb__i", lb), lbT = $(".lb__t", lb), lbM = $(".lb__m", lb), lbY = $(".lb__y", lb);
  var lbCount = $(".lb__count", lb), lbHint = $(".lb__hint", lb);
  var btnClose = $(".lb__close", lb), btnPrev = $(".lb__nav--prev", lb), btnNext = $(".lb__nav--next", lb);
  var allFigures = $$("[data-full]");
  var list = [], current = 0, box = null, lastFocused = null, token = 0;
  var Z = { s: 1, x: 0, y: 0 };
  var backdropEls = [nav, document.getElementById("top"), $(".foot")];
  var HINT_IDLE = finePointer ? "Click or scroll to zoom" : "Tap or pinch to zoom";
  var HINT_ZOOM = finePointer ? "Drag to look around · click to reset" : "Drag to look around · tap to reset";

  function entry(fig) {
    var img = $("img", fig);
    function txt(sel) { var el = $(sel, fig); return el ? el.textContent.trim() : ""; }
    return {
      fig: fig, img: img, full: fig.getAttribute("data-full"), tone: fig.getAttribute("data-tone"),
      w: +img.getAttribute("width"), h: +img.getAttribute("height"),
      num: txt(".art__i"), title: txt(".art__t"), medium: txt(".art__m"), year: txt(".art__y"),
      alt: img.getAttribute("alt") || ""
    };
  }
  function buildList() {
    list = allFigures.filter(function (f) { return !f.closest(".is-out"); }).map(entry);
  }

  /* every piece has its own address (#elder), so a single work can be shared;
     Back closes the viewer instead of leaving the page */
  var baseTitle = document.title, pushed = false;
  function slugOf(title) {
    return title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function figFromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return null;
    for (var k = 0; k < allFigures.length; k++) {
      if (slugOf(entry(allFigures[k]).title) === h) return allFigures[k];
    }
    return null;
  }
  function clearHash() {
    history.replaceState(null, "", location.pathname + location.search);
  }
  function setBackgroundInert(on) {
    backdropEls.forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute("aria-hidden", "true"); el.inert = true; }
      else { el.removeAttribute("aria-hidden"); el.inert = false; }
    });
  }
  function fitBox(e) {
    var vw = view.clientWidth, vh = view.clientHeight, small = vw <= 620;
    var padX = small ? 10 : Math.max(76, vw * 0.06);
    var padT = small ? 62 : 72;
    var padB = (lbBar ? lbBar.offsetHeight : 80) + (small ? 6 : 10);
    var aw = vw - padX * 2, ah = vh - padT - padB;
    var r = Math.min(aw / e.w, ah / e.h, 1.25);
    var w = e.w * r, h = e.h * r;
    return { l: padX + (aw - w) / 2, t: padT + (ah - h) / 2, w: w, h: h };
  }
  function frameT(b, dx) { return "translate3d(" + (b.l + (dx || 0)) + "px," + b.t + "px,0)"; }
  function rectT(r, b) {
    var v = view.getBoundingClientRect();
    return "translate3d(" + (r.left - v.left) + "px," + (r.top - v.top) + "px,0) scale(" + (r.width / b.w) + "," + (r.height / b.h) + ")";
  }
  function preload(i) {
    if (i < 0 || i >= list.length) return;
    var im = new Image(); im.decoding = "async"; im.src = list[i].full;
  }

  /* zoom state lives on the <img>; the frame stays at the fitted box */
  function applyZoom(smooth) {
    lbImg.classList.toggle("is-smooth", !!smooth);
    lbImg.style.transform = "translate3d(" + Z.x + "px," + Z.y + "px,0) scale(" + Z.s + ")";
    var zoomed = Z.s > 1.01;
    lb.classList.toggle("is-zoomed", zoomed);
    lbImg.classList.toggle("is-zoomed", zoomed);
    if (lbHint) lbHint.textContent = zoomed ? HINT_ZOOM : HINT_IDLE;
  }
  function bounds() {
    var vw = view.clientWidth, vh = view.clientHeight, sw = box.w * Z.s, sh = box.h * Z.s;
    function axis(v, size, off, view_) {
      if (size <= view_) return (view_ - size) / 2 - off;
      return clamp(v, view_ - size - off, -off);
    }
    if (Z.s <= 1.0001) { Z.x = 0; Z.y = 0; return; }
    Z.x = axis(Z.x, sw, box.l, vw);
    Z.y = axis(Z.y, sh, box.t, vh);
  }
  function maxZoom() { var e = list[current]; return clamp(e.w / box.w * 1.4, 2.5, 6); }
  function zoomAt(s, cx, cy, smooth) {
    var v = view.getBoundingClientRect();
    var px = cx - v.left - box.l, py = cy - v.top - box.t;
    var ns = clamp(s, 1, maxZoom());
    var ux = (px - Z.x) / Z.s, uy = (py - Z.y) / Z.s;
    Z.x = px - ux * ns; Z.y = py - uy * ns; Z.s = ns;
    bounds();
    applyZoom(smooth);
  }
  function resetZoom(smooth) { Z.s = 1; Z.x = 0; Z.y = 0; applyZoom(smooth); }

  function render(i) {
    var e = list[i];
    current = i;
    var my = ++token;
    resetZoom(false);
    box = fitBox(e);
    lbFrame.style.width = box.w + "px";
    lbFrame.style.height = box.h + "px";
    lbFrame.style.transform = frameT(box);
    lbImg.src = e.img.currentSrc || e.img.src;
    lbImg.alt = e.alt;
    var full = new Image();
    full.decoding = "async";
    full.src = e.full;
    (full.decode ? full.decode() : Promise.resolve()).then(function () {
      if (my === token) lbImg.src = e.full;
    }).catch(function () {});
    lbI.textContent = e.num; lbT.textContent = e.title; lbM.textContent = e.medium; lbY.textContent = e.year;
    if (lbOpen) {
      history.replaceState({ lb: true }, "", "#" + slugOf(e.title));
      document.title = e.title + " · " + baseTitle;
    }
    lbCount.textContent = (i + 1) + " / " + list.length;
    lbAmb.classList.add("is-swapping");
    setTimeout(function () {
      if (my !== token) return;
      lbAmb.src = e.img.currentSrc || e.img.src;
      lbAmb.classList.remove("is-swapping");
    }, 260);
    setTone(e.tone);
    list.forEach(function (x) { x.fig.classList.toggle("is-lifted", x === e); });
    preload(i + 1); preload(i - 1);
  }
  function scrollbarComp(on) {
    var sb = window.innerWidth - root.clientWidth;
    document.body.style.paddingRight = on && sb > 0 ? sb + "px" : "";
    document.body.style.overflow = on ? "hidden" : "";
  }
  function openLB(fig, fromEl, still) {
    buildList();
    var i = list.findIndex(function (x) { return x.fig === fig; });
    if (i < 0) return;
    lastFocused = document.activeElement;
    if (!(history.state && history.state.lb)) { history.pushState({ lb: true }, ""); pushed = true; }
    lbOpen = true;
    lbFrame.getAnimations && lbFrame.getAnimations().forEach(function (a) { a.cancel(); });
    var srcEl = fromEl || list[i].img, fly = !still && inViewport(srcEl);
    var source = srcEl.getBoundingClientRect();
    lb.classList.add("is-visible");
    lb.setAttribute("aria-hidden", "false");
    scrollbarComp(true);
    setBackgroundInert(true);
    if (cursorEnabled) { document.body.classList.remove("has-cursor"); }
    render(i);
    if (!reduce && fly && lbFrame.animate) {
      lbFrame.animate([{ transform: rectT(source, box) }, { transform: frameT(box) }], { duration: 720, easing: EASE });
    }
    requestAnimationFrame(function () { lb.classList.add("open"); });
    btnClose.focus({ preventScroll: true });
  }
  function closeLB(fromHistory) {
    if (!lbOpen) return;
    lbOpen = false;
    document.title = baseTitle;
    if (fromHistory !== true) {
      if (pushed) history.back();
      else clearHash();
    }
    pushed = false;
    token++;
    resetZoom(false);
    var e = list[current];
    lb.classList.remove("open");
    function done() {
      if (lbOpen) return;
      lb.classList.remove("is-visible");
      lb.setAttribute("aria-hidden", "true");
      list.forEach(function (x) { x.fig.classList.remove("is-lifted"); });
      lbFrame.getAnimations && lbFrame.getAnimations().forEach(function (a) { a.cancel(); });
    }
    scrollbarComp(false);
    setBackgroundInert(false);
    if (cursorEnabled) { document.body.classList.add("has-cursor"); }
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
    if (reduce || !lbFrame.animate) { done(); return; }
    var anim;
    if (inViewport(e.img)) {
      anim = lbFrame.animate([{ transform: frameT(box) }, { transform: rectT(e.img.getBoundingClientRect(), box) }], { duration: 560, easing: EASE, fill: "forwards" });
    } else {
      anim = lbFrame.animate([{ opacity: 1, transform: frameT(box) }, { opacity: 0, transform: frameT(box) + " scale(0.96)" }], { duration: 320, easing: "ease-out", fill: "forwards" });
    }
    anim.onfinish = done;
  }
  function go(dir) {
    if (list.length < 2) return;
    var next = (current + dir + list.length) % list.length;
    if (reduce || !lbFrame.animate) { render(next); return; }
    lbFrame.getAnimations().forEach(function (a) { a.cancel(); });
    var from = box;
    var out = lbFrame.animate([{ opacity: 1, transform: frameT(from) }, { opacity: 0, transform: frameT(from, -dir * 60) }], { duration: 180, easing: "ease-in", fill: "forwards" });
    out.onfinish = function () {
      render(next);
      out.cancel();
      lbFrame.animate([{ opacity: 0, transform: frameT(box, dir * 60) }, { opacity: 1, transform: frameT(box) }], { duration: 480, easing: EASE });
    };
  }

  allFigures.forEach(function (f) {
    var btn = $(".art__open", f);
    if (btn) btn.addEventListener("click", function () { openLB(f); });
  });
  btnClose.addEventListener("click", closeLB);
  window.addEventListener("popstate", function () {
    var f = figFromHash();
    if (lbOpen && !f) closeLB(true);
    else if (!lbOpen && f) openLB(f);
  });
  (function openFromLink() {
    var f = figFromHash();
    if (!f) return;
    history.replaceState({ lb: true }, "", location.href);
    // land on the piece so closing the viewer leaves you beside it
    f.scrollIntoView({ block: "center", behavior: "auto" });
    requestAnimationFrame(function () { openLB(f, null, true); });
  })();
  btnPrev.addEventListener("click", function () { go(-1); });
  btnNext.addEventListener("click", function () { go(1); });

  /* pointer gestures: tap, drag-to-pan, pinch, swipe */
  var ptrs = new Map(), G = null;
  function onImage(cx, cy) {
    var r = lbImg.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }
  function pinchInfo() {
    var p = Array.from(ptrs.values());
    return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }
  view.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    view.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lbImg.classList.remove("is-smooth");
    if (ptrs.size === 1) {
      G = { type: "pending", sx: e.clientX, sy: e.clientY, t: now(), x0: Z.x, y0: Z.y, hit: onImage(e.clientX, e.clientY) };
    } else if (ptrs.size === 2) {
      var pi = pinchInfo();
      G = { type: "pinch", d0: pi.d, s0: Z.s, mx: pi.x, my: pi.y };
    }
  });
  view.addEventListener("pointermove", function (e) {
    if (!ptrs.has(e.pointerId) || !G) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (G.type === "pinch" && ptrs.size === 2) {
      var pi = pinchInfo();
      // anchor at the original midpoint, then follow the fingers as they travel
      zoomAt(G.s0 * pi.d / G.d0, G.mx, G.my, false);
      Z.x += pi.x - G.mx; Z.y += pi.y - G.my;
      G.mx = pi.x; G.my = pi.y; G.s0 = Z.s; G.d0 = pi.d;
      bounds(); applyZoom(false);
      return;
    }
    var dx = e.clientX - G.sx, dy = e.clientY - G.sy;
    if (G.type === "pending" && Math.hypot(dx, dy) > 6) G.type = Z.s > 1.01 ? "pan" : "swipe";
    if (G.type === "pan") {
      lbImg.classList.add("is-dragging");
      Z.x = G.x0 + dx; Z.y = G.y0 + dy;
      bounds(); applyZoom(false);
    } else if (G.type === "swipe") {
      var down = Math.max(0, dy);
      lbImg.style.transform = "translate3d(" + dx * 0.9 + "px," + (dy > 0 ? dy * 0.7 : dy * 0.15) + "px,0) scale(" + (1 - Math.min(down / 1600, 0.12)) + ")";
      $(".lb__backdrop", lb).style.opacity = String(1 - Math.min(down / 500, 0.6));
    }
  });
  function endPointer(e, cancelled) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    lbImg.classList.remove("is-dragging");
    if (!G) return;
    if (G.type === "pinch") {
      if (ptrs.size === 1) {
        var p = ptrs.values().next().value;
        G = { type: "pan", sx: p.x, sy: p.y, x0: Z.x, y0: Z.y };
      } else if (ptrs.size === 0) {
        if (Z.s < 1.05) resetZoom(true);
        G = null;
      }
      return;
    }
    if (ptrs.size) return;
    var dx = e.clientX - G.sx, dy = e.clientY - G.sy, g = G;
    G = null;
    $(".lb__backdrop", lb).style.opacity = "";
    if (cancelled) { applyZoom(true); return; }
    if (g.type === "pending") {
      if (!g.hit) { closeLB(); return; }
      if (Z.s > 1.01) resetZoom(true);
      else zoomAt(clamp(list[current].w / box.w, 2.2, maxZoom()), e.clientX, e.clientY, true);
    } else if (g.type === "swipe") {
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { lbImg.style.transform = ""; go(dx < 0 ? 1 : -1); }
      else if (dy > 110) closeLB();
      else applyZoom(true);
    } else if (g.type === "pan") {
      bounds(); applyZoom(true);
    }
  }
  view.addEventListener("pointerup", function (e) { endPointer(e, false); });
  view.addEventListener("pointercancel", function (e) { endPointer(e, true); });
  view.addEventListener("wheel", function (e) {
    if (!lbOpen) return;
    e.preventDefault();
    var k = e.ctrlKey ? 0.012 : 0.0025;
    zoomAt(Z.s * Math.exp(-e.deltaY * k), e.clientX, e.clientY, false);
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (!lbOpen) return;
    var v = view.getBoundingClientRect(), cx = v.left + v.width / 2, cy = v.top + v.height / 2;
    if (e.key === "Escape") closeLB();
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "+" || e.key === "=") zoomAt(Z.s * 1.5, cx, cy, true);
    else if (e.key === "-") zoomAt(Z.s / 1.5, cx, cy, true);
    else if (e.key === "0") resetZoom(true);
  });
  window.addEventListener("resize", function () {
    if (!lbOpen) return;
    resetZoom(false);
    box = fitBox(list[current]);
    lbFrame.style.width = box.w + "px";
    lbFrame.style.height = box.h + "px";
    lbFrame.style.transform = frameT(box);
  });
  if (lbHint) lbHint.textContent = HINT_IDLE;

  /* =========================================================
     Index view: the collection set as type; the hovered piece floats under the cursor
     ========================================================= */
  (function indexView() {
    var wrap = $(".index"), listEl = wrap && $(".index__list", wrap), preview = wrap && $(".index__preview", wrap);
    var viewBtns = $$(".views__btn");
    if (!wrap || !grid || !viewBtns.length) return;
    var hoverPreview = finePointer;

    var rows = gridItems.map(function (it, i) {
      var fig = $(".art", it), e = entry(fig);
      var li = document.createElement("li");
      li.className = "index__row";
      li.style.setProperty("--i", i);
      var btn = document.createElement("button");
      btn.className = "index__open";
      btn.type = "button";
      btn.setAttribute("aria-label", "View “" + e.title + "”, " + e.medium + (e.year ? ", " + e.year : ""));
      var thumb = document.createElement("span");
      thumb.className = "index__thumb";
      var timg = document.createElement("img");
      timg.alt = ""; timg.loading = "lazy"; timg.decoding = "async";
      timg.src = e.full.replace("-full.webp", "-400.webp");
      thumb.appendChild(timg);
      btn.appendChild(thumb);
      [["index__n", e.num], ["index__t", e.title], ["index__m", e.medium], ["index__y", e.year]].forEach(function (p) {
        var s = document.createElement("span");
        s.className = p[0]; s.textContent = p[1];
        btn.appendChild(s);
      });
      li.appendChild(btn);
      listEl.appendChild(li);
      var row = { it: it, li: li, fig: fig, e: e, thumb: timg, src: e.full.replace("-full.webp", "-640.webp") };
      btn.addEventListener("click", function () {
        var from = hoverPreview && previewOn && preview.lastElementChild ? preview.lastElementChild : (inViewport(timg) ? timg : null);
        hide();
        openLB(fig, from);
      });
      if (hoverPreview) {
        btn.addEventListener("pointerenter", function () { show(row); });
        btn.addEventListener("focus", function () { setTone(row.e.tone); });
      }
      return row;
    });

    function sync() { rows.forEach(function (r) { r.li.classList.toggle("is-out", !matches(r.it)); }); }
    grid.addEventListener("filterchange", sync);

    /* floating preview: eased toward the cursor, leaning into horizontal motion */
    var px = 0, py = 0, tx = 0, ty = 0, pw = 300, ph = 360, raf = 0, previewOn = false, current = null, preloaded = false;
    function loop() {
      var nx = lerp(px, tx, 0.15), ny = lerp(py, ty, 0.15), vx = nx - px;
      px = nx; py = ny;
      preview.style.transform = "translate3d(" + (px - pw / 2).toFixed(1) + "px," + (py - ph / 2).toFixed(1) + "px,0) rotate(" + clamp(vx * 0.5, -9, 9).toFixed(2) + "deg)";
      raf = previewOn || Math.abs(tx - px) > 0.3 || Math.abs(ty - py) > 0.3 ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function show(row) {
      if (current === row) return;
      current = row;
      // keep every piece at roughly the same visual weight, whatever its shape
      var ratio = row.e.w / row.e.h, area = 300 * 360;
      pw = Math.min(560, Math.sqrt(area * ratio)); ph = pw / ratio;
      preview.style.width = pw + "px";
      preview.style.height = ph + "px";
      var img = document.createElement("img");
      img.alt = ""; img.decoding = "async"; img.src = row.src;
      preview.appendChild(img);
      if (img.animate && !reduce) {
        img.animate([{ clipPath: "inset(100% 0 0 0)", transform: "scale(1.12)" }, { clipPath: "inset(0 0 0 0)", transform: "none" }], { duration: 650, easing: EASE });
      }
      while (preview.children.length > 2) preview.removeChild(preview.firstElementChild);
      if (!previewOn) { px = tx; py = ty; }
      previewOn = true;
      preview.classList.add("is-on");
      setTone(row.e.tone);
      kick();
    }
    function hide() {
      previewOn = false;
      current = null;
      preview.classList.remove("is-on");
    }
    if (hoverPreview) {
      window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; if (previewOn) kick(); }, { passive: true });
      listEl.addEventListener("pointerleave", hide);
      window.addEventListener("scroll", function () { if (previewOn && !listEl.matches(":hover")) hide(); }, { passive: true });
    }

    function setView(v) {
      var toIndex = v === "index";
      viewBtns.forEach(function (b) {
        var on = b.getAttribute("data-view") === v;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (toIndex === !wrap.hidden) return;
      hide();
      sync();
      grid.hidden = toIndex;
      wrap.hidden = !toIndex;
      if (toIndex) {
        wrap.classList.remove("is-entering");
        void wrap.offsetWidth;
        if (!reduce) wrap.classList.add("is-entering");
        if (hoverPreview && !preloaded) {
          preloaded = true;
          rows.forEach(function (r) { var im = new Image(); im.decoding = "async"; im.src = r.src; });
        }
      } else if (!reduce && grid.animate) {
        grid.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: EASE });
      }
    }
    viewBtns.forEach(function (b) {
      b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
    });
  })();

  /* ---- "Say hello." holds a slow light; on desktop it follows the cursor ---- */
  (function contactLight() {
    var sec = $(".contact"), title = sec && $(".contact__title", sec);
    if (!title || reduce || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (ents) { sec.classList.toggle("is-live", ents[0].isIntersecting); }).observe(sec);
    if (!finePointer) return;
    title.addEventListener("pointermove", function (e) {
      var r = title.getBoundingClientRect();
      title.classList.add("is-tracking");
      title.style.setProperty("--lx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      title.style.setProperty("--ly", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
    title.addEventListener("pointerleave", function () {
      title.classList.remove("is-tracking");
      title.style.removeProperty("--lx");
      title.style.removeProperty("--ly");
    });
  })();
})();
