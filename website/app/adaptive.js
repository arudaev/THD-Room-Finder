(() => {
  const themeColor = document.querySelector('meta[name="theme-color"]:not([media])');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function syncThemeColor() {
    if (!themeColor) return;
    themeColor.setAttribute('content', darkQuery.matches ? '#111318' : '#FDFCFF');
  }

  syncThemeColor();

  if (typeof darkQuery.addEventListener === 'function') {
    darkQuery.addEventListener('change', syncThemeColor);
  } else if (typeof darkQuery.addListener === 'function') {
    darkQuery.addListener(syncThemeColor);
  }
})();
