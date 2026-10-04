// "Hakeme sor" kutusu: soruyu /api/soru adresine gönderir, yanıtı sayfada gösterir.
// Yanıt alınamazsa (kota dolması dahil) kopyalama ipucunu açar.
(function () {
  var form = document.getElementById('soru-form');
  if (!form) return;

  var input = document.getElementById('soru-metin');
  var counter = document.getElementById('soru-sayac');
  var button = document.getElementById('soru-gonder');
  var status = document.getElementById('soru-durum');
  var answer = document.getElementById('soru-yanit');
  var answerText = document.getElementById('soru-yanit-metin');
  var fallback = document.getElementById('soru-yedek');
  var trap = document.getElementById('soru-tuzak');
  var MAX = Number(input.getAttribute('maxlength')) || 600;
  var TIMEOUT = 70000;

  function updateCounter() {
    counter.textContent = input.value.length + ' / ' + MAX;
  }
  input.addEventListener('input', updateCounter);

  // Örnek soruya dokununca kutuya yazılır
  var example = document.getElementById('soru-ornek');
  if (example) {
    example.addEventListener('click', function () {
      input.value = document.getElementById('soru-ornek-metin').textContent.replace(/\s+/g, ' ').trim();
      updateCounter();
      input.focus();
    });
  }
  updateCounter();

  function setBusy(busy) {
    button.disabled = busy;
    button.textContent = busy ? 'Hakem düşünüyor…' : 'Hakeme sor';
  }

  function showFallback(message) {
    status.textContent = message;
    answer.hidden = true;
    fallback.hidden = false;
  }

  function ask(question) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT) : null;
    return fetch('/api/soru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, website: trap.value }),
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

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (question.length < 5) {
      status.textContent = 'Durumu birkaç kelimeyle yazar mısın?';
      return;
    }
    setBusy(true);
    status.textContent = '';
    fallback.hidden = true;

    ask(question).then(function (result) {
      setBusy(false);
      if (result.status === 200 && result.data && result.data.answer) {
        answerText.textContent = result.data.answer;
        answer.hidden = false;
        answer.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (result.status === 429) {
        status.textContent = 'Çok hızlı soruldu. Bir dakika sonra tekrar dener misin?';
        return;
      }
      showFallback('Hakem şu an yanıt veremiyor.');
    }, function () {
      setBusy(false);
      showFallback('Hakeme ulaşılamadı.');
    });
  });
})();
