# OneFCM landing — shared page skeleton (ALL pages must use this exactly)

Every page: `<!doctype html><html lang="en">` … include in `<head>`:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PAGE TITLE — OneFCM</title>
<meta name="description" content="...">
<meta name="theme-color" content="#070a12">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="stylesheet" href="assets/site.css">
<script>/* prevent theme flash */(function(){var t=localStorage.getItem('onefcm-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)})();</script>
<script src="assets/site.js" defer></script>
```

## NAV (right after <body>) — identical on every page; set class="active" on the current page's link

```html
<nav class="nav">
  <div class="wrap nav-in">
    <a class="logo" href="index.html"><img src="assets/logo-mark.png" alt="">OneFCM</a>
    <div class="nav-links">
      <a href="index.html#features">Features</a>
      <a href="index.html#how">How it works</a>
      <a href="docs.html">Docs</a>
      <a href="pricing.html">Pricing</a>
      <a href="https://github.com/mobarokOP/OpenFCM" target="_blank" rel="noreferrer">GitHub</a>
    </div>
    <div class="nav-cta">
      <button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <a class="btn btn-ghost btn-sm" href="https://dashboard.onefcm.com/login">Log in</a>
      <a class="btn btn-primary btn-sm" href="https://dashboard.onefcm.com/register">Sign up</a>
      <button class="menu-btn" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
    </div>
  </div>
</nav>
<div class="mobile-menu">
  <a href="index.html#features">Features</a>
  <a href="index.html#how">How it works</a>
  <a href="docs.html">Docs</a>
  <a href="pricing.html">Pricing</a>
  <a href="https://github.com/mobarokOP/OpenFCM">GitHub</a>
  <a class="btn btn-primary" style="margin-top:8px" href="https://dashboard.onefcm.com/register">Sign up free</a>
</div>
```

## FOOTER (before </body>) — identical on every page

```html
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="index.html" style="margin-bottom:12px"><img src="assets/logo-mark.png" alt="">OneFCM</a>
        <p style="color:var(--muted);font-size:.92rem;max-width:280px">Self-hosted Android push notifications. One SDK, one App ID — your server, your data.</p>
      </div>
      <div>
        <h4>Product</h4>
        <a href="index.html#features">Features</a>
        <a href="pricing.html">Pricing</a>
        <a href="https://dashboard.onefcm.com">Dashboard</a>
      </div>
      <div>
        <h4>Developers</h4>
        <a href="docs.html">Documentation</a>
        <a href="docs.html#rest-api">REST API</a>
        <a href="https://github.com/mobarokOP/OpenFCM" target="_blank" rel="noreferrer">GitHub</a>
      </div>
      <div>
        <h4>Legal</h4>
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms of Service</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span style="display:inline-flex;align-items:center;gap:8px"><img src="assets/logo-mark.png" alt="" width="20" height="20" style="border-radius:6px">© 2026 OneFCM · Android push, self-hosted.</span>
      <span>Built on Firebase Cloud Messaging HTTP v1</span>
    </div>
  </div>
</footer>
```

## Available utilities (site.css / site.js)
- Theme: auto light/dark + `toggleTheme()`
- `.reveal` (+ `data-delay="1..4"`) — scroll-in animation, auto-wired
- `.code` block: `<div class="code"><div class="code-head"><div class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div> filename.kt</div><button class="copy-btn">Copy</button><pre>…</pre></div>` — copy button auto-wired; token classes `tk-k tk-s tk-f tk-c tk-n`
- Tabs: wrapper `<div class="tabs" data-tabs="NAME">` with `<button class="tab active" data-tab="a">`; panels `<div data-tab-panel="a" data-group="NAME" class="active">`
- `.card.hover`, `.tile-ic`, `.eyebrow`, `.sec-title`, `.sec-sub`, `.grad-text`, `.badge`, `.btn*`, `.step-num`
- Docs pages: `.docs-layout` grid + `.docs-side` (sticky sidebar, scroll-spy auto) + `.docs-body`, `.callout.info/.warn`

## Brand voice
Product = **OneFCM** (display). Technical identifiers stay: `com.github.mobarokOP:OpenFCM:3.0.1`, `com.openfcm.sdk`, `OpenFCM.init(...)` in code, repo URL. API base: `https://admin.onefcm.com` (+ `/v1`). Dashboard: `https://dashboard.onefcm.com`.
