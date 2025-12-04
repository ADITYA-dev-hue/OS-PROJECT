// Shared theme toggle — persists choice and syncs across pages/tabs.
// Uses localStorage key 'rtpm_theme' to match existing scripts.
(function(){
  const KEY = 'rtpm_theme';
  const btnId = 'themeToggle';

  function applyTheme(theme){
    if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    updateButton(theme);
  }

  function updateButton(theme){
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  
  function currentThemeFallback(){
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById(btnId);
    const initial = currentThemeFallback();
    applyTheme(initial);

    if (btn){
      btn.addEventListener('click', ()=>{
        const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem(KEY, now);
        applyTheme(now);
      });
    }

    // sync across tabs/windows
    window.addEventListener('storage', (e)=>{
      if (e.key === KEY){
        const t = e.newValue || currentThemeFallback();
        applyTheme(t);
      }
    });
  });
})();
