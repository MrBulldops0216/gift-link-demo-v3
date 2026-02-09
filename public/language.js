let currentLanguage = 'en';

function initLanguage() {
  const saved = localStorage.getItem('appLanguage');
  if (saved && (saved === 'en' || saved === 'zh_TW')) {
    currentLanguage = saved;
  } else {
    const browserLang = navigator.language || navigator.userLanguage || '';
    currentLanguage = browserLang.startsWith('zh') ? 'zh_TW' : 'en';
  }
  applyLanguage();
}

function getTranslation(keyPath) {
  const keys = keyPath.split('.');
  let value = translations[currentLanguage];
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = translations.en;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return keyPath;
        }
      }
      break;
    }
  }
  return value;
}

function t(keyPath) {
  const value = getTranslation(keyPath);
  return typeof value === 'string' ? value : keyPath;
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'zh_TW') return;
  currentLanguage = lang;
  localStorage.setItem('appLanguage', lang);
  applyLanguage();
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

function getLanguage() {
  return currentLanguage;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === 'zh_TW' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
  if (typeof window.updateLanguageSpecificElements === 'function') {
    window.updateLanguageSpecificElements();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguage);
} else {
  initLanguage();
}
