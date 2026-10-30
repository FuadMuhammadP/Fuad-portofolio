// ==========================================================
// Fuad Portfolio — Main JS
// ==========================================================

// ---------- Toggle menu mobile ----------
const toggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

function setMenu(open) {
  mobileMenu.classList.toggle('hidden', !open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Tutup' : 'Menu';
}

toggle.addEventListener('click', () => {
  setMenu(mobileMenu.classList.contains('hidden'));
});

mobileMenu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => setMenu(false))
);

// ---------- Smooth scroll custom (tanpa lompat) ----------
const header = document.querySelector('header');
let scrollFrame = null;

// Kurva easing: pelan di awal, cepat di tengah, pelan di akhir
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function smoothScrollTo(targetY) {
  const html = document.documentElement;
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;

  // Durasi menyesuaikan jarak: 650ms – 1100ms
  const duration = Math.min(1100, Math.max(650, Math.abs(distance) * 0.45));
  const startTime = performance.now();

  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  // Matikan scroll-behavior CSS sementara agar animasi JS tidak bertabrakan
  html.style.scrollBehavior = 'auto';

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) {
      scrollFrame = requestAnimationFrame(step);
    } else {
      html.style.scrollBehavior = '';
      scrollFrame = null;
    }
  }

  scrollFrame = requestAnimationFrame(step);
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const id = anchor.getAttribute('href');
    const target = id && id.length > 1 ? document.querySelector(id) : null;
    if (!target) return;

    e.preventDefault();
    const offset = header ? header.offsetHeight : 0;
    const targetY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);

    smoothScrollTo(targetY);
    history.pushState(null, '', id); // URL tetap ter-update (#profile, dst.)
  });
});

// Hentikan animasi jika pengguna scroll manual (wheel / sentuh)
['wheel', 'touchstart'].forEach((evt) =>
  window.addEventListener(
    evt,
    () => {
      if (scrollFrame) {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
        document.documentElement.style.scrollBehavior = '';
      }
    },
    { passive: true }
  )
);

// ---------- Lightbox: preview + zoom & geser gambar ----------
const lightbox = document.getElementById('lightbox');
const stage = document.getElementById('lightbox-stage');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const zoomLabel = document.getElementById('zoom-reset');

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const view = { scale: 1, x: 0, y: 0, baseW: 0, baseH: 0 };

function computeBaseSize() {
  const st = stage.getBoundingClientRect();
  const availW = Math.max(100, st.width - 48);
  const availH = Math.max(100, st.height - 48);
  const natW = lightboxImg.naturalWidth || 800;
  const natH = lightboxImg.naturalHeight || 600;
  const fitRatio = Math.min(1, availW / natW, availH / natH);
  view.baseW = Math.round(natW * fitRatio);
  view.baseH = Math.round(natH * fitRatio);
}

function applyView() {
  if (!view.baseW || !view.baseH) computeBaseSize();
  // Ubah ukuran layout langsung (width/height) bukan CSS scale(),
  // supaya browser me-render ulang dari piksel asli gambar (tetap tajam saat di-zoom)
  lightboxImg.style.width = `${Math.round(view.baseW * view.scale)}px`;
  lightboxImg.style.height = `${Math.round(view.baseH * view.scale)}px`;
  lightboxImg.style.transform = `translate(${view.x}px, ${view.y}px)`;
  zoomLabel.textContent = `${Math.round(view.scale * 100)}%`;
  stage.classList.toggle('is-zoomed', view.scale > 1);
}

// Jaga agar gambar tidak bisa digeser keluar layar
function clampPan() {
  const st = stage.getBoundingClientRect();
  const w = view.baseW * view.scale;
  const h = view.baseH * view.scale;
  const maxX = Math.max(0, (w - st.width) / 2 + 24);
  const maxY = Math.max(0, (h - st.height) / 2 + 24);
  view.x = Math.min(maxX, Math.max(-maxX, view.x));
  view.y = Math.min(maxY, Math.max(-maxY, view.y));
}

// Zoom ke titik tertentu (clientX, clientY) agar bagian di bawah kursor tetap di tempat
function zoomTo(newScale, clientX, clientY) {
  newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
  if (newScale < 1.01) newScale = 1; // bulatkan ke 100% agar gambar kembali ke tengah
  const st = stage.getBoundingClientRect();
  const cx = st.left + st.width / 2;
  const cy = st.top + st.height / 2;
  const px = (clientX ?? cx) - cx;
  const py = (clientY ?? cy) - cy;
  const ratio = newScale / view.scale;

  view.x = px - ratio * (px - view.x);
  view.y = py - ratio * (py - view.y);
  view.scale = newScale;

  if (view.scale === 1) { view.x = 0; view.y = 0; }
  else clampPan();
  applyView();
}

function resetView() {
  view.scale = 1; view.x = 0; view.y = 0;
  applyView();
}

function openLightbox(src, alt, caption) {
  stage.classList.add('no-anim');
  view.scale = 1; view.x = 0; view.y = 0; view.baseW = 0; view.baseH = 0;
  lightboxImg.onload = () => {
    computeBaseSize();
    applyView();
    requestAnimationFrame(() => stage.classList.remove('no-anim'));
  };
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightboxCaption.textContent = caption;
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // kunci scroll halaman
  if (lightboxImg.complete && lightboxImg.naturalWidth) {
    lightboxImg.onload();
  }
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('a.frame').forEach((frame) => {
  frame.addEventListener('click', (e) => {
    e.preventDefault();
    const img = frame.querySelector('img');
    const caption = frame.closest('figure')?.querySelector('figcaption')?.textContent
      || frame.closest('article')?.querySelector('h3')?.textContent
      || img.alt;
    openLightbox(frame.getAttribute('href'), img.alt, caption.trim());
  });
});

// Tombol toolbar
document.getElementById('zoom-in').addEventListener('click', () => zoomTo(view.scale * 1.5));
document.getElementById('zoom-out').addEventListener('click', () => zoomTo(view.scale / 1.5));
zoomLabel.addEventListener('click', resetView);
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

// Scroll mouse / touchpad = zoom
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  stage.classList.add('no-anim');
  zoomTo(view.scale * factor, e.clientX, e.clientY);
  clearTimeout(stage._animTimer);
  stage._animTimer = setTimeout(() => stage.classList.remove('no-anim'), 120);
}, { passive: false });

// Double-click = zoom 3x ke titik itu / kembali ke 100%
stage.addEventListener('dblclick', (e) => {
  if (view.scale > 1) resetView();
  else zoomTo(3, e.clientX, e.clientY);
});

// Drag (mouse) + pinch (layar sentuh) memakai Pointer Events
const pointers = new Map();
let dragStart = null;
let pinchStart = null;
let moved = false;

stage.addEventListener('pointerdown', (e) => {
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  moved = false;

  if (pointers.size === 1) {
    dragStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    dragStart = null;
  }
});

stage.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    stage.classList.add('no-anim');
    zoomTo(pinchStart.scale * (dist / pinchStart.dist), (a.x + b.x) / 2, (a.y + b.y) / 2);
    moved = true;
  } else if (dragStart && view.scale > 1) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    stage.classList.add('is-dragging');
    view.x = dragStart.vx + dx;
    view.y = dragStart.vy + dy;
    clampPan();
    applyView();
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) {
    dragStart = null;
    stage.classList.remove('is-dragging', 'no-anim');
  }
}
stage.addEventListener('pointerup', (e) => {
  // Klik di area kosong (bukan gambar) saat tidak zoom = tutup
  if (!moved && e.target === stage && view.scale === 1) closeLightbox();
  endPointer(e);
});
stage.addEventListener('pointercancel', endPointer);

// Keyboard: Esc tutup, + / - zoom, 0 reset
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === '+' || e.key === '=') zoomTo(view.scale * 1.5);
  else if (e.key === '-') zoomTo(view.scale / 1.5);
  else if (e.key === '0') resetView();
});
// ---------- Highlight menu aktif + garis indikator bergeser mulus ----------
const links = document.querySelectorAll('.nav-link');
const desktopNav = document.getElementById('desktop-nav');
const navIndicator = document.getElementById('nav-indicator');

function moveIndicatorTo(activeLink) {
  if (!desktopNav || !navIndicator || !activeLink) return;
  const navRect = desktopNav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const left = linkRect.left - navRect.left;
  navIndicator.style.width = `${linkRect.width}px`;
  navIndicator.style.transform = `translateX(${left}px)`;
}

function setActiveSection(sectionId) {
  let activeDesktopLink = null;
  links.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${sectionId}`;
    link.classList.toggle('is-active', isActive);
    if (isActive && desktopNav && desktopNav.contains(link)) {
      activeDesktopLink = link;
    }
  });
  if (activeDesktopLink) moveIndicatorTo(activeDesktopLink);
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      setActiveSection(entry.target.id);
    });
  },
  { rootMargin: '-45% 0px -45% 0px' } // aktif saat section berada di tengah layar
);

document.querySelectorAll('main section').forEach((s) => observer.observe(s));

// Posisikan indikator saat halaman dimuat dan saat ukuran layar berubah
window.addEventListener('load', () => {
  const current = desktopNav?.querySelector('.nav-link.is-active') || desktopNav?.querySelector('.nav-link');
  if (current) moveIndicatorTo(current);
});
window.addEventListener('resize', () => {
  const current = desktopNav?.querySelector('.nav-link.is-active');
  if (current) moveIndicatorTo(current);
});
