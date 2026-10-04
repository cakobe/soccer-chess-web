// "Hakeme sor" sohbeti: mesajı önceki konuşmayla birlikte /api/soru adresine gönderir,
// yanıtı sohbet akışına ekler. Yanıt alınamazsa (kota dolması dahil) kopyalama ipucunu açar.
(function () {
  var form = document.getElementById('soru-form');
  if (!form) return;

  var input = document.getElementById('soru-metin');
  var label = document.getElementById('soru-etiket');
  var counter = document.getElementById('soru-sayac');
  var button = document.getElementById('soru-gonder');
  var clear = document.getElementById('soru-temizle');
  var status = document.getElementById('soru-durum');
  var chat = document.getElementById('soru-sohbet');
  var examples = document.getElementById('soru-ornekler');
  var fallback = document.getElementById('soru-yedek');
  var trap = document.getElementById('soru-tuzak');
  var MAX = Number(input.getAttribute('maxlength')) || 600;
  var TIMEOUT = 70000;
  var STORAGE_KEY = 'sc-hakem-sohbet';
  var MAX_STORED = 30;

  // Konuşma geçmişi: { role: 'user' | 'assistant', content: '...' }
  var history = [];
  var busy = false;

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_STORED)));
    } catch (e) {}
  }

  function load() {
    try {
      var stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content;
      });
    } catch (e) {
      return [];
    }
  }

  function updateCounter() {
    counter.textContent = input.value.length + ' / ' + MAX;
  }

  function addBubble(role, text, pending) {
    var who = document.createElement('span');
    who.className = 'chat__who';
    who.textContent = role === 'user' ? 'Siz' : 'AI Hakem';
    var body = document.createElement('p');
    body.className = 'chat__text';
    body.textContent = text;
    var item = document.createElement('div');
    item.className = 'chat__msg chat__msg--' + (role === 'user' ? 'user' : 'ref') + (pending ? ' is-pending' : '');
    item.appendChild(who);
    item.appendChild(body);
    chat.appendChild(item);

    chat.scrollTop = chat.scrollHeight;
    return item;
  }

  // Sohbet başlayınca örnek soru gizlenir, etiket ve temizle düğmesi değişir
  function refresh() {
    var started = history.length > 0;

    clear.hidden = !started;
    if (examples) examples.hidden = started;
    label.textContent = started ? 'Ek bilgi verin ya da yeni bir soru sorun' : 'Maçta ne oldu?';
  }

  function setBusy(value) {
    busy = value;
    button.disabled = value;
    clear.disabled = value;
  }

  function showFallback(message) {
    status.textContent = message;
    fallback.hidden = false;
  }

  function ask(question, previous) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT) : null;
    return fetch('/api/soru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, history: previous, website: trap.value }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (result) {
      if (timer) clearTimeout(timer);
      return result;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function submit() {
    if (busy) return;
    var question = input.value.replace(/\s+/g, ' ').trim();
    if (question.length < (history.length ? 2 : 5)) {
      status.textContent = 'Durumu birkaç kelimeyle yazar mısın?';
      return;
    }
    var previous = history.slice(-8);
    var mine = addBubble('user', question, false);
    var pending = addBubble('assistant', 'AI Hakem karar veriyor…', true);
    input.value = '';
    updateCounter();
    status.textContent = '';
    fallback.hidden = true;
    setBusy(true);

    // Başarısız olursa mesaj sohbetten geri alınır ve kutuya geri yazılır
    function undo(message, withFallback) {
      chat.removeChild(mine);
      chat.removeChild(pending);
      input.value = question;
      updateCounter();
      setBusy(false);
      refresh();
      if (withFallback) showFallback(message);
      else status.textContent = message;
    }

    ask(question, previous).then(function (result) {
      if (result.status === 200 && result.data && result.data.answer) {
        pending.className = 'chat__msg chat__msg--ref';
        pending.lastChild.textContent = result.data.answer;
        history.push({ role: 'user', content: question });
        history.push({ role: 'assistant', content: result.data.answer });
        save();
        setBusy(false);
        refresh();
        chat.scrollTop = chat.scrollHeight;
        return;
      }
      if (result.status === 429) {
        undo('Çok hızlı soruldu. Bir dakika sonra tekrar dener misin?', false);
        return;
      }
      undo('AI Hakem şu an yanıt veremiyor.', true);
    }, function () {
      undo('AI Hakeme ulaşılamadı.', true);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submit();
  });

  // Bilgisayarda Enter gönderir, Shift+Enter yeni satır açar; telefonda Enter yeni satırdır
  input.addEventListener('keydown', function (event) {
    var desktop = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (desktop && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit();
    }
  });

  input.addEventListener('input', updateCounter);

  // Örnek soruya dokununca soru hemen gönderilir
  if (examples) {
    examples.addEventListener('click', function (event) {
      var chip = event.target.closest ? event.target.closest('.ask__chip') : null;
      if (!chip || busy) return;
      input.value = chip.textContent.replace(/\s+/g, ' ').trim();
      submit();
    });
  }

  clear.addEventListener('click', function () {
    history = [];
    save();
    // Karşılama mesajı kalır, konuşma silinir
    while (chat.children.length > 1) chat.removeChild(chat.lastChild);
    status.textContent = '';
    fallback.hidden = true;
    refresh();
    input.focus();
  });

  // Sayfa yenilenirse (örneğin dil değişince) sohbet kaldığı yerden sürer
  history = load();
  for (var i = 0; i < history.length; i++) addBubble(history[i].role, history[i].content, false);
  clear.textContent = 'Sohbeti temizle';
  updateCounter();
  refresh();
})();
