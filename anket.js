// Deneme sürümü anketi: soruları çizer, yanıtları /api/anket adresine gönderir.
(function () {
  var root = document.getElementById('anket-alani');
  if (!root) return;

  var ENDPOINT = '/api/anket';
  var MAX_TEXT = 2000;

  // tek: tek seçim, cok: çoklu seçim, puan: 1-10, sayi: sayı girişi
  var SECTIONS = [
    {
      title: 'Isınma turu',
      hint: 'Önce seni tanıyalım.',
      items: [
        { q: 'Yaş aralığın?', type: 'tek', options: ['12 ve altı', '13–17', '18–24', '25–34', '35–44', '45 ve üzeri'] },
        { q: 'Kaç maç oynadın?', type: 'tek', options: ['1', '2–3', '4–6', '7 ve üzeri'] },
        { q: 'Kaç kişiyle oynadınız?', type: 'tek', options: ['2 kişi', '3–4 kişi', '5 ve üzeri'] },
        { q: 'Masa oyunlarıyla aran nasıl?', type: 'tek', options: ['Sık oynarım', 'Ara sıra', 'Nadiren'] },
        { q: 'Futbolla aran nasıl?', type: 'tek', options: ['Oynarım ve izlerim', 'Sadece izlerim', 'Pek ilgim yok'] }
      ]
    },
    {
      title: 'Kurallar',
      hint: 'Oyunu öğrenmek nasıl geçti?',
      items: [
        { q: 'Kuralları öğrenmek nasıldı?', type: 'tek', options: ['Çok kolay', 'Kolay', 'Orta', 'Zor', 'Çok zor'] },
        { q: 'Kuralları kavraman ne kadar sürdü?', type: 'tek', options: ['5 dakikadan az', '5–15 dakika', '15–30 dakika', '30 dakikadan fazla'] },
        { q: 'Kuralları nereden öğrendin?', type: 'cok', options: ['Bu siteden', 'Yazılı kural metninden', 'Biri anlattı', 'Oynarken çözdük'] },
        { q: 'Maç sırasında kural anlaşmazlığı yaşadınız mı?', type: 'tek', options: ['Hiç', 'Bir iki kez', 'Sık sık'] },
        { q: 'Topun kimde olduğunu hesaplamak (kare sayma) nasıldı?', type: 'tek', options: ['Kolay ve hızlı', 'İdare eder', 'Oyunu yavaşlatıyor', 'Kafa karıştırıcı'] }
      ]
    },
    {
      title: 'Sahada',
      hint: 'Maçın kendisi.',
      items: [
        { q: 'Kaç hamle turuyla oynadınız?', type: 'cok', options: ['1 tur', '2 tur', '3 ve üzeri'] },
        { q: 'Bir maç yaklaşık ne kadar sürdü?', type: 'tek', options: ['15 dakikadan az', '15–30 dakika', '30–60 dakika', '1 saatten fazla'] },
        { q: 'Maç süresi nasıl geldi?', type: 'tek', options: ['Kısa', 'Tam kıvamında', 'Uzun'] },
        { q: 'Vuruş yapmak nasıldı?', type: 'tek', options: ['Çok zor', 'Zor ama keyifli', 'Tam kıvamında', 'Fazla kolay'] },
        { q: 'Maçta hangisi daha ağır bastı?', type: 'tek', options: ['Strateji', 'İkisi dengeli', 'Vuruş becerisi'] },
        { q: 'Hangi opsiyonel kuralları denediniz?', type: 'cok', options: ['Top Kapma', 'Yarı Saha Gerisi Gol Yok', 'Ofsayt', 'Taç Bizim', 'Üç Korner Bir Penaltı', 'Özel Kart Sayılır', 'Pas Şartı', 'Hiçbirini'] },
        { q: 'Saha, piyonlar, top ve kalecinin kalitesi nasıldı?', type: 'tek', options: ['Çok iyi', 'İyi', 'Orta', 'Zayıf'] }
      ]
    },
    {
      title: 'Tribünden yorum',
      hint: 'Genel izlenimin.',
      items: [
        { q: 'En çok neyi sevdin?', type: 'cok', options: ['Strateji kurmak', 'Vuruş yapmak', 'Gol atmak', 'Rakibin planını bozmak', 'Arkadaşlarla rekabet', 'Futbolcu kartları ve değerleri'] },
        { q: 'Soccer Chess\'e 10 üzerinden kaç verirsin?', type: 'puan' },
        { q: 'Tekrar oynar mısın?', type: 'tek', options: ['Kesinlikle', 'Muhtemelen', 'Emin değilim', 'Sanmıyorum'] },
        { q: 'Arkadaşına önerir misin?', type: 'tek', options: ['Kesinlikle', 'Belki', 'Hayır'] }
      ]
    },
    {
      title: 'Son düdük',
      hint: 'Piyasaya çıkmadan önce son sorular.',
      items: [
        { q: 'Satışa çıksa alır mıydın?', type: 'tek', options: ['Hemen alırım', 'Fiyatına bağlı', 'Hediye olarak alırım', 'Almam'] },
        { q: 'Sence makul fiyatı ne olmalı? (TL)', type: 'sayi' },
        { q: 'Bu site kuralları anlamana yetti mi?', type: 'tek', options: ['Evet, yeterli', 'Kısmen', 'Video olsa daha iyi olurdu', 'Hayır'] }
      ]
    }
  ];

  // Seçenekli yanıtlarla görüş metnini e-postada eşleştirmek için kısa numara
  var responseId = (function () {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 6; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
  })();

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'text') node.textContent = attrs[key];
        else if (key === 'class') node.className = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function send(payload) {
    payload.id = responseId;
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.ok) return;
      var err = new Error('send');
      err.status = res.status;
      throw err;
    });
  }

  function errorText(err) {
    if (err && err.status === 429) return 'Çok hızlı gönderildi. Bir dakika sonra tekrar dener misin?';
    return 'Gönderilemedi. Bağlantını kontrol edip tekrar dener misin?';
  }

  function show(panel, keepScroll) {
    root.textContent = '';
    root.appendChild(panel);
    if (!keepScroll) root.scrollIntoView({ block: 'start' });
  }

  /* --- 1. adım: seçenekli sorular --------------------------------------- */

  var questions = [];
  var questionCount = 0;

  function chip(type, name, value, label) {
    var input = el('input', { type: type, name: name, value: value });
    return el('label', { class: 'chip' }, [input, el('span', { text: label || value })]);
  }

  function buildQuestion(item) {
    var name = 'q' + questionCount++;
    var field = el('fieldset', { class: 'q' });
    var legend = el('legend', { text: item.q });
    if (item.type === 'cok') legend.appendChild(el('small', { text: ' Birden fazla seçebilirsin' }));
    field.appendChild(legend);

    var body;
    if (item.type === 'sayi') {
      var input = el('input', { type: 'number', name: name, min: '0', max: '1000000', step: '1', inputmode: 'numeric', class: 'q__number', placeholder: 'Örn. 750', 'aria-label': item.q });
      body = el('div', { class: 'chips' }, [input]);
    } else if (item.type === 'puan') {
      body = el('div', { class: 'chips chips--score' });
      for (var i = 1; i <= 10; i++) body.appendChild(chip('radio', name, String(i)));
    } else {
      body = el('div', { class: 'chips' });
      item.options.forEach(function (opt) {
        body.appendChild(chip(item.type === 'cok' ? 'checkbox' : 'radio', name, opt));
      });
    }
    field.appendChild(body);
    questions.push({ q: item.q, type: item.type, name: name, field: field });
    return field;
  }

  function readAnswer(question) {
    if (question.type === 'sayi') {
      var value = question.field.querySelector('input').value.trim();
      return value ? value + ' TL' : '';
    }
    var checked = question.field.querySelectorAll('input:checked');
    return Array.prototype.map.call(checked, function (input) { return input.value; }).join(', ');
  }

  function collect() {
    var answers = [];
    questions.forEach(function (question) {
      var a = readAnswer(question);
      // Soru sonundaki işaretleri e-posta listesinde sadeleştir
      if (a) answers.push({ q: question.q.replace(/[?:]\s*$/, ''), a: a });
    });
    return answers;
  }

  function buildStepOne() {
    var bar = el('span', { class: 'survey__bar-fill' });
    var count = el('span', { class: 'survey__count', text: '' });
    var progress = el('div', { class: 'survey__progress' }, [el('div', { class: 'survey__bar' }, [bar]), count]);

    var form = el('form', { class: 'survey__form', novalidate: '' });
    form.appendChild(el('p', { class: 'survey__intro', text: 'Yaklaşık 2 dakika sürer. Hiçbir soru zorunlu değil; aklına yatanları işaretle, gerisini geç.' }));
    form.appendChild(progress);

    SECTIONS.forEach(function (section, index) {
      var block = el('section', { class: 'survey__section' }, [
        el('p', { class: 'survey__step', text: (index + 1) + ' / ' + SECTIONS.length }),
        el('h3', { text: section.title }),
        el('p', { class: 'survey__hint', text: section.hint })
      ]);
      section.items.forEach(function (item) { block.appendChild(buildQuestion(item)); });
      form.appendChild(block);
    });

    // Botlar için tuzak alan; insanlar görmez
    var trap = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'survey__trap' });
    form.appendChild(trap);

    var status = el('p', { class: 'survey__status', role: 'status' });
    var submit = el('button', { type: 'submit', class: 'btn btn--primary survey__submit', text: 'Yanıtları gönder ve detaylı görüş ve öneriye geç' });
    form.appendChild(el('div', { class: 'survey__actions' }, [submit, status]));

    function update() {
      var done = collect().length;
      bar.style.width = Math.round((done / questions.length) * 100) + '%';
      count.textContent = done + ' / ' + questions.length + ' yanıtlandı';
    }
    form.addEventListener('change', update);
    form.addEventListener('input', update);
    update();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var answers = collect();
      if (!answers.length) {
        status.textContent = 'Göndermeden önce en az bir soruyu yanıtlar mısın?';
        return;
      }
      submit.disabled = true;
      status.textContent = 'Gönderiliyor…';
      send({ type: 'secim', answers: answers, website: trap.value }).then(function () {
        show(buildStepTwo());
      }).catch(function (err) {
        submit.disabled = false;
        status.textContent = errorText(err);
      });
    });

    return form;
  }

  /* --- 2. adım: detaylı görüş ve öneri ---------------------------------- */

  function buildStepTwo() {
    var name = el('input', { type: 'text', id: 'anket-ad', maxlength: '80', autocomplete: 'off', class: 'survey__input', placeholder: 'İstersen adın ya da ulaşabileceğimiz bir adres' });
    var text = el('textarea', { id: 'anket-gorus', maxlength: String(MAX_TEXT), rows: '8', class: 'survey__textarea', placeholder: 'Neyi değiştirirdin? Hangi kural kafanı karıştırdı? Aklına gelen her şey işimize yarar.' });
    var counter = el('span', { class: 'survey__counter', text: '0 / ' + MAX_TEXT });
    var status = el('p', { class: 'survey__status', role: 'status' });
    var submit = el('button', { type: 'submit', class: 'btn btn--primary', text: 'Gönder' });
    var skip = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Yazmadan bitir' });

    var form = el('form', { class: 'survey__form survey__form--narrow', novalidate: '' }, [
      el('span', { class: 'survey__badge', text: 'Yanıtların ulaştı' }),
      el('h3', { text: 'Detaylı görüş ve öneri' }),
      el('p', { class: 'survey__hint', text: 'Seçenekler her şeyi anlatmaz. Oyunu daha iyi yapacak fikrini, yaşadığın sorunu ya da hoşuna gideni kendi cümlelerinle yaz.' }),
      el('label', { class: 'survey__label', for: 'anket-gorus', text: 'Görüş ve önerin' }),
      text,
      counter,
      el('label', { class: 'survey__label', for: 'anket-ad', text: 'Ad / iletişim (isteğe bağlı)' }),
      name,
      el('div', { class: 'survey__actions survey__actions--row' }, [submit, skip]),
      status
    ]);

    text.addEventListener('input', function () {
      counter.textContent = text.value.length + ' / ' + MAX_TEXT;
    });

    skip.addEventListener('click', function () { show(buildThanks(false)); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!text.value.trim()) {
        status.textContent = 'Göndermek için birkaç cümle yazar mısın? Yazmak istemezsen "Yazmadan bitir" de.';
        return;
      }
      submit.disabled = true;
      skip.disabled = true;
      status.textContent = 'Gönderiliyor…';
      send({ type: 'gorus', text: text.value, name: name.value }).then(function () {
        show(buildThanks(true));
      }).catch(function (err) {
        submit.disabled = false;
        skip.disabled = false;
        status.textContent = errorText(err);
      });
    });

    return form;
  }

  /* --- 3. adım: teşekkür ------------------------------------------------ */

  function buildThanks(withText) {
    return el('div', { class: 'survey__thanks' }, [
      el('span', { class: 'survey__badge', text: 'Tamamlandı' }),
      el('h3', { text: 'Teşekkürler, maçın adamı sensin.' }),
      el('p', { class: 'survey__hint', text: withText
        ? 'Yanıtların ve görüşün bize ulaştı. Soccer Chess\'in son hâlinde senin de payın olacak.'
        : 'Yanıtların bize ulaştı. Soccer Chess\'in son hâlinde senin de payın olacak.' })
    ]);
  }

  show(buildStepOne(), true);
})();
