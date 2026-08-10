(function(){
'use strict';
var doc = document.documentElement;
doc.classList.add('js');
var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
var deskFine = matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)');
var forceDesk = /[?&]motion=desktop/.test(location.search);
var forceTouch = /[?&]motion=touch/.test(location.search);
function deskOn(){ if (forceTouch) return false; return forceDesk || deskFine.matches; }

/* ---------- reveal system: fail to visible ---------- */
var revealed = false;
function revealAll(){
  if (revealed) return;
  document.querySelectorAll('.hl,.hl2,.frame,.rv').forEach(function(el){ el.classList.add('in'); });
  revealed = true;
}
setTimeout(revealAll, 2500);
addEventListener('load', function(){ setTimeout(function(){
  if (!('IntersectionObserver' in window)) revealAll();
}, 400); });
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') setTimeout(revealAll, 1200); });

if (reduced || !('IntersectionObserver' in window)){
  revealAll();
} else {
  /* hero lines: on load, immediately */
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    var h = document.querySelector('.hero .hl');
    if (h) h.classList.add('in');
  }); });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.hl2,.frame,.rv').forEach(function(el){ io.observe(el); });
}

/* ---------- nav state ---------- */
var nav = document.getElementById('nav');
var heroSec = document.querySelector('.hero');
function navState(){
  var limit = heroSec ? heroSec.offsetHeight - 90 : 10;
  nav.classList.toggle('on', (window.scrollY || 0) > limit);
}
addEventListener('scroll', navState, { passive: true });
addEventListener('resize', navState, { passive: true });
navState();

/* ---------- Lenis (desktop, fine pointer only) ---------- */
var lenis = null;
if (deskOn() && !forceDesk && deskFine.matches && !reduced && window.Lenis){
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
  doc.style.scrollBehavior = 'auto';
  (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(ev){
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      ev.preventDefault();
      lenis.scrollTo(t, { offset: id === '#darbai' ? 0 : -72 });
    });
  });
  /* Lenis nepriima klaviatūros — Home/End/PageUp/Down/rodyklės/tarpas per scrollTo */
  addEventListener('keydown', function(e){
    if (e.defaultPrevented) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var lbEl = document.getElementById('lb');
    if (lbEl && lbEl.open) return;
    var max = document.documentElement.scrollHeight - innerHeight;
    if (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){
      e.preventDefault();
      lenis.scrollTo(e.key === 'ArrowUp' ? 0 : max, { duration: 1.1 });
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var vh = innerHeight * 0.88, y = window.scrollY || 0, to = null, dur = 0.6;
    switch (e.key){
      case 'Home': to = 0; dur = 1.1; break;
      case 'End': to = max; dur = 1.1; break;
      case 'PageDown': to = y + vh; break;
      case 'PageUp': to = y - vh; break;
      case 'ArrowDown': to = y + 110; dur = 0.35; break;
      case 'ArrowUp': to = y - 110; dur = 0.35; break;
      case ' ': to = y + (e.shiftKey ? -vh : vh); break;
      default: return;
    }
    e.preventDefault();
    lenis.scrollTo(Math.max(0, Math.min(max, to)), { duration: dur });
  });
}

/* ---------- gallery: scroll-linked horizontal scrub ---------- */
var gal = document.querySelector('.gal');
var track = document.getElementById('gtrack');
var counter = document.getElementById('gcur');
var frames = track ? track.querySelectorAll('.frame') : [];
var scrubOn = false, glen = 0, cur = 0, target = 0, ticking = false;

function setCounter(i){
  if (!counter) return;
  var s = String(Math.min(frames.length, Math.max(1, i + 1)));
  counter.textContent = (s.length < 2 ? '0' : '') + s;
}
function scrubSetup(){
  var want = deskOn() && !reduced;
  if (want === scrubOn && want) { scrubMeasure(); return; }
  scrubOn = want;
  gal.classList.toggle('scrub', scrubOn);
  track.style.transform = '';
  if (!scrubOn) nav.classList.remove('hide');
  if (scrubOn) scrubMeasure();
}
function scrubMeasure(){
  track.style.transform = '';
  glen = track.scrollWidth + (parseFloat(getComputedStyle(track).paddingLeft) || 0) * 2 - innerWidth;
  if (glen < 0) glen = 0;
  gal.style.setProperty('--glen', (glen + innerHeight) + 'px');
}
function scrubFrame(){
  if (!scrubOn){ ticking = false; return; }
  var top = gal.getBoundingClientRect().top;
  var p = glen > 0 ? Math.min(1, Math.max(0, -top / glen)) : 0;
  nav.classList.toggle('hide', top <= 1 && p < 0.999);
  target = -p * glen;
  cur += (target - cur) * (lenis ? 1 : 0.12);
  if (Math.abs(target - cur) < 0.5) cur = target;
  track.style.transform = 'translate3d(' + cur.toFixed(2) + 'px,0,0)';
  setCounter(Math.round(p * (frames.length - 1)));
  if (Math.abs(target - cur) >= 0.5) requestAnimationFrame(scrubFrame);
  else ticking = false;
}
if (gal && track && frames.length){
  scrubSetup();
  addEventListener('scroll', function(){
    if (scrubOn && !ticking){ ticking = true; requestAnimationFrame(scrubFrame); }
  }, { passive: true });
  addEventListener('resize', function(){ scrubSetup(); }, { passive: true });
  deskFine.addEventListener('change', scrubSetup);
  /* touch rail counter */
  track.addEventListener('scroll', function(){
    if (scrubOn) return;
    var max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return;
    setCounter(Math.round((track.scrollLeft / max) * (frames.length - 1)));
  }, { passive: true });
}

/* ---------- lightbox + view transitions ---------- */
var lb = document.getElementById('lb');
var lbimg = document.getElementById('lbimg');
var lbcap = document.getElementById('lbcap');
function biggestWebp(fig){
  var s = fig.querySelector('source[type="image/webp"]');
  if (!s) return fig.querySelector('img').currentSrc;
  var parts = s.srcset.split(',');
  return parts[parts.length - 1].trim().split(' ')[0];
}
function openLb(fig){
  var img = fig.querySelector('img');
  var cap = fig.querySelector('figcaption');
  lbimg.src = biggestWebp(fig);
  lbimg.alt = img.alt;
  lbcap.textContent = cap ? cap.textContent : '';
  if (document.startViewTransition && !reduced){
    img.style.viewTransitionName = 'lbimg';
    var vt = document.startViewTransition(function(){
      img.style.viewTransitionName = '';
      lb.showModal();
    });
    vt.ready.catch(function(){});
    vt.finished.catch(function(){}).finally(function(){ img.style.viewTransitionName = ''; });
  } else {
    lb.showModal();
  }
}
function closeLb(){
  if (!lb.open) return;
  if (document.startViewTransition && !reduced){
    var vt = document.startViewTransition(function(){ lb.close(); });
    vt.finished.catch(function(){});
    vt.ready.catch(function(){});
  } else lb.close();
}
if (lb){
  document.querySelectorAll('.frame-btn').forEach(function(b){
    b.addEventListener('click', function(){ openLb(b.closest('.frame')); });
  });
  document.getElementById('lbx').addEventListener('click', closeLb);
  lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });
}

/* ---------- gallery cursor (fine pointer): lerp follow, alive states ---------- */
var gcur = document.getElementById('gcur-el');
if (gcur && gal && matchMedia('(hover:hover) and (pointer:fine)').matches && !reduced){
  var inGal = false, cx = 0, cy = 0, tx = 0, ty = 0, curRaf = false;
  function curFrame(){
    cx += (tx - cx) * 0.24;
    cy += (ty - cy) * 0.24;
    gcur.style.transform = 'translate(' + (cx - 37).toFixed(1) + 'px,' + (cy - 37).toFixed(1) + 'px)';
    if (inGal || Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) requestAnimationFrame(curFrame);
    else curRaf = false;
  }
  gal.addEventListener('pointerenter', function(e){
    inGal = true;
    cx = tx = e.clientX; cy = ty = e.clientY;
    gcur.classList.add('on');
    if (!curRaf){ curRaf = true; requestAnimationFrame(curFrame); }
  });
  gal.addEventListener('pointerleave', function(){
    inGal = false;
    gcur.classList.remove('on', 'frame', 'press');
  });
  addEventListener('pointermove', function(e){
    if (!inGal) return;
    tx = e.clientX; ty = e.clientY;
    var overFrame = e.target.closest && e.target.closest('.frame-btn');
    gcur.classList.toggle('frame', !!overFrame);
  }, { passive: true });
  gal.addEventListener('pointerdown', function(){ gcur.classList.add('press'); });
  addEventListener('pointerup', function(){ gcur.classList.remove('press'); }, { passive: true });
}

/* ---------- magnetic CTA (one) ---------- */
var cta = document.getElementById('cta');
if (cta && deskOn() && !reduced){
  cta.addEventListener('pointermove', function(e){
    var r = cta.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    cta.style.transform = 'translate(' + (dx * 0.12).toFixed(1) + 'px,' + (dy * 0.18).toFixed(1) + 'px)';
  });
  cta.addEventListener('pointerleave', function(){
    cta.style.transition = 'transform 300ms cubic-bezier(.22,1,.36,1)';
    cta.style.transform = '';
    setTimeout(function(){ cta.style.transition = ''; }, 320);
  });
}

/* ---------- mobile call bar ---------- */
var callbar = document.createElement('div');
callbar.className = 'callbar';
callbar.innerHTML = '<a href="tel:+37062028824">Skambinti · +370 620 28824</a>';
document.body.appendChild(callbar);
var contactSec = document.getElementById('kontaktai');
var nearContact = false;
function callbarState(){
  callbar.classList.toggle('on', (window.scrollY || 0) > innerHeight * 0.9 && !nearContact);
}
if ('IntersectionObserver' in window && contactSec){
  new IntersectionObserver(function(en){
    nearContact = en[0].isIntersecting;
    callbarState();
  }, { threshold: 0 }).observe(contactSec);
}
addEventListener('scroll', callbarState, { passive: true });

/* ---------- form ---------- */
var form = document.getElementById('cform');
var note = document.getElementById('fnote');
if (form){
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim();
    var contact = form.contact.value.trim();
    var msg = form.message.value.trim();
    if (form._honey.value) { return; }
    if (!name || !contact || !msg){
      note.className = 'form-note err';
      note.textContent = 'Užpildykite visus laukelius.';
      var first = [form.name, form.contact, form.message].find(function(f){ return !f.value.trim(); });
      if (first) first.focus();
      return;
    }
    /* DEMO režimas: siuntimas neprijungtas — įjungiant realų endpointą,
       FormSubmit alias 54a654bd2d308825a09cbedad871fb37 jau aktyvuotas evolvia.info@gmail.com */
    var btn = form.querySelector('.btn-form');
    btn.disabled = true;
    note.className = 'form-note';
    note.textContent = 'Siunčiama…';
    setTimeout(function(){
      note.className = 'form-note ok';
      note.textContent = 'Jūsų užklausa pateikta. Susisieksime per 1–2 darbo dienas.';
      form.reset();
      btn.disabled = false;
    }, 700);
  });
}
})();
