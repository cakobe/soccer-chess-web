// Dil seçimi: ziyaretçinin tarayıcı diline göre sayfayı çevirir.
// Sayfanın aslı Türkçedir; çeviriler i18n.js içindeki tablolardan gelir.
(function () {
  var data = window.SC_I18N;
  var SUPPORTED = ['tr', 'en', 'es', 'de', 'fr'];
  var FALLBACK = 'en';
  var STORAGE_KEY = 'sc-dil';
  var ATTRS = ['placeholder', 'alt', 'aria-label', 'title'];
  var select = document.getElementById('dil');

  function saved() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function detect() {
    var choice = saved();
    if (choice && SUPPORTED.indexOf(choice) !== -1) return choice;
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || FALLBACK];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i]).toLowerCase().split('-')[0];
      if (SUPPORTED.indexOf(code) !== -1) return code;
    }
    return FALLBACK;
  }

  var lang = detect();

  if (select) {
    select.value = lang;
    select.addEventListener('change', function () {
      try {
        localStorage.setItem(STORAGE_KEY, select.value);
      } catch (e) {}
      location.reload();
    });
  }

  if (lang === 'tr' || !data || !data[lang]) return;
  document.documentElement.lang = lang;

  var map = {};
  for (var i = 0; i < data.src.length; i++) {
    if (data[lang][i]) map[data.src[i]] = data[lang][i];
  }

  function norm(text) {
    return text.replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  function lookup(text) {
    var key = norm(text);
    return key && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
  }

  function translateText(node) {
    var raw = node.nodeValue;
    var found = lookup(raw);
    if (found === null) return;
    // Kenardaki boşluk, bitişik öğelerle arayı korumak için saklanır
    node.nodeValue = (/^\s/.test(raw) ? ' ' : '') + found + (/\s$/.test(raw) ? ' ' : '');
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var value = el.getAttribute(ATTRS[i]);
      if (!value) continue;
      var found = lookup(value);
      if (found !== null) el.setAttribute(ATTRS[i], found);
    }
  }

  function walk(node) {
    if (node.nodeType === 3) {
      translateText(node);
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.nodeName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') {
      if (tag === 'TEXTAREA') translateAttrs(node);
      return;
    }
    translateAttrs(node);
    for (var child = node.firstChild; child; child = child.nextSibling) walk(child);
  }

  var title = lookup(document.title);
  if (title !== null) document.title = title;
  var description = document.querySelector('meta[name="description"]');
  if (description) {
    var text = lookup(description.getAttribute('content') || '');
    if (text !== null) description.setAttribute('content', text);
  }

  walk(document.body);

  // Sonradan eklenen içerik (anket, hakem yanıt durumu) de çevrilir
  if (typeof MutationObserver === 'function') {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (record.type === 'characterData') {
          translateText(record.target);
        } else {
          for (var j = 0; j < record.addedNodes.length; j++) walk(record.addedNodes[j]);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
})();
