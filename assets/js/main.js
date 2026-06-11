/* ============================================================================
   TEST — Seefar Homepage v0 — interactions
   Scroll reveals/counters use a getBoundingClientRect check (load + scroll +
   resize), not IntersectionObserver, so content can never get trapped hidden.
   Reduced-motion safe throughout.
   ============================================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.lucide) lucide.createIcons();

  /* ---------- C4 footprint map: dotted equirectangular world ---------- */
  var COLS = 64, ROWS = 30;
  var land = {
    0:[[5,9],[25,27],[44,58]], 1:[[4,12],[24,28],[38,58]], 2:[[4,14],[24,27],[36,59]],
    3:[[4,16],[25,27],[33,60]], 4:[[4,17],[33,61]], 5:[[5,17],[31,61]],
    6:[[6,17],[30,61]], 7:[[7,16],[30,60]], 8:[[8,15],[30,58],[57,59]],
    9:[[9,15],[31,58]], 10:[[13,17],[31,42],[43,56]], 11:[[14,18],[31,48]],
    12:[[15,18],[31,48]], 13:[[18,20],[32,46],[50,54]], 14:[[18,24],[33,44],[51,55]],
    15:[[18,25],[34,43],[52,56]], 16:[[19,25],[35,42]], 17:[[19,26],[36,41]],
    18:[[20,26],[37,41],[52,58]], 19:[[20,26],[37,40],[51,59]], 20:[[21,25],[38,40],[52,58]],
    21:[[21,25],[38,40],[53,57]], 22:[[21,24],[38,39]], 23:[[21,24]],
    24:[[21,23]], 25:[[21,23]], 26:[[21,22]], 27:[[21,22]]
  };
  var pins = [ [34,11],[35,14],[37,16],[40,14],[42,11],[46,10],[48,12],[50,13] ];
  var pinEls = [];
  var svg = document.getElementById("worldMap");
  if (svg) {
    var W = 640, H = 300, cw = W / COLS, ch = H / ROWS;
    var ns = "http://www.w3.org/2000/svg";
    var frag = document.createDocumentFragment();
    Object.keys(land).forEach(function (r) {
      land[r].forEach(function (rng) {
        for (var c = rng[0]; c <= rng[1]; c++) {
          var dot = document.createElementNS(ns, "circle");
          dot.setAttribute("cx", (c * cw + cw / 2).toFixed(1));
          dot.setAttribute("cy", (r * ch + ch / 2).toFixed(1));
          dot.setAttribute("r", "2.1");
          dot.setAttribute("fill", "rgba(0,134,204,0.28)");
          frag.appendChild(dot);
        }
      });
    });
    svg.appendChild(frag);
    pins.forEach(function (p) {
      var g = document.createElementNS(ns, "circle");
      g.setAttribute("cx", (p[0] * cw + cw / 2).toFixed(1));
      g.setAttribute("cy", (p[1] * ch + ch / 2).toFixed(1));
      g.setAttribute("r", "5");
      g.setAttribute("fill", "#0086CC");
      g.setAttribute("stroke", "#FFFFFF");
      g.setAttribute("stroke-width", "1.5");
      if (!reduce) {
        g.style.opacity = "0"; g.style.transform = "scale(0)";
        g.style.transformOrigin = "center"; g.style.transformBox = "fill-box";
      }
      svg.appendChild(g);
      pinEls.push(g);
    });
  }
  var pinsPlayed = false;
  function playPins() {
    if (pinsPlayed) return; pinsPlayed = true;
    if (reduce) return;
    pinEls.forEach(function (el, i) {
      setTimeout(function () {
        el.style.transition = "opacity .35s ease, transform .45s cubic-bezier(0.2,0.6,0.2,1)";
        el.style.opacity = "1"; el.style.transform = "scale(1)";
      }, 110 * i);
    });
  }

  /* ---------- count-up ---------- */
  function runCount(el) {
    if (el.dataset.counting) return;
    el.dataset.counting = "1";
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduce) { el.textContent = target; return; }
    var start = null, dur = 1100;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // settle guarantee (rAF is paused in hidden tabs/iframes)
    setTimeout(function () { el.textContent = target; }, dur + 150);
  }

  /* ---------- robust in-view engine (load + scroll + resize) ----------
     Base state is visible. We add .pre (hidden) up-front, then remove it
     when an element scrolls into view to play the entrance. */
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  var counters = [].slice.call(document.querySelectorAll(".counter__fig[data-count]"));
  function inView(el, ratio) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var trigger = vh * (ratio == null ? 0.92 : ratio);
    return r.top < trigger && r.bottom > 0;
  }
  function check() {
    for (var i = reveals.length - 1; i >= 0; i--) {
      if (inView(reveals[i])) { reveals[i].classList.remove("pre"); reveals.splice(i, 1); }
    }
    for (var j = counters.length - 1; j >= 0; j--) {
      if (inView(counters[j], 0.85)) { runCount(counters[j]); counters.splice(j, 1); }
    }
    if (svg && !pinsPlayed && inView(svg, 0.8)) playPins();
  }
  if (reduce) {
    counters.forEach(function (c) { c.textContent = c.getAttribute("data-count"); });
  } else {
    // hide up-front (synchronous, before first paint) so we can animate in
    reveals.forEach(function (r) { r.classList.add("pre"); });
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { check(); ticking = false; });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();
    setTimeout(check, 250);
    window.addEventListener("load", check);
    // hard fallback: never leave content trapped if scroll/transitions never fire
    function revealAll() {
      reveals.forEach(function (r) { r.classList.remove("pre"); });
      reveals.length = 0;
      counters.forEach(function (c) { runCount(c); });
      counters.length = 0;
      playPins();
    }
    setTimeout(revealAll, 1600);
  }

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById("drawer");
  var burger = document.getElementById("burger");
  function openDrawer() { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; }
  function closeDrawer() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }
  if (burger) burger.addEventListener("click", openDrawer);
  if (drawer) {
    drawer.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeDrawer); });
    drawer.querySelectorAll(".drawer__sub a, .drawer__cta a, .drawer__item > a").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
    drawer.querySelectorAll(".drawer__acc").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".drawer__item");
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  /* ---------- footer accordions (mobile only; desktop shows all) ---------- */
  document.querySelectorAll(".ftr__acc").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (window.innerWidth >= 880) return;
      var col = btn.closest(".ftr__col");
      var open = col.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- C9 video tap-to-load (placeholder confirmation) ---------- */
  document.querySelectorAll(".video").forEach(function (v) {
    v.addEventListener("click", function (e) {
      e.preventDefault();
      var play = v.querySelector(".video__play");
      if (play) play.innerHTML = '<span style="font-family:var(--font-sans);font-size:11px;color:var(--seefar-blue);font-weight:600">Loading…</span>';
    });
  });

  /* ---------- cookie bar ---------- */
  var cookie = document.getElementById("cookie");
  try { if (localStorage.getItem("sf_cookie_choice")) cookie.classList.add("is-hidden"); } catch (err) {}
  function dismissCookie(choice) {
    try { localStorage.setItem("sf_cookie_choice", choice); } catch (err) {}
    cookie.classList.add("is-hidden");
  }
  var ca = document.getElementById("cookieAccept"), cd = document.getElementById("cookieDecline");
  if (ca) ca.addEventListener("click", function () { dismissCookie("accept"); });
  if (cd) cd.addEventListener("click", function () { dismissCookie("decline"); });

  /* ---------- search affordance (stub) ---------- */
  var sb = document.getElementById("searchBtn");
  if (sb) sb.addEventListener("click", function () { sb.setAttribute("aria-expanded", "true"); });
})();
