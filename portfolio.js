(function () {
  'use strict';

  var INITIAL_VISIBLE = 9;
  var LOAD_MORE_COUNT = 3;
  var currentFilter = 'all';
  var filtered = [];
  var visibleCount = 0;

  var grid       = document.getElementById('pf-grid');
  var moreBtn    = document.getElementById('pf-more-btn');
  var tabsEl     = document.getElementById('pf-tabs');
  var emptyEl    = document.getElementById('pf-empty');
  var overlay    = document.getElementById('pf-modal-overlay');
  var modalVideo = document.getElementById('pf-modal-video');
  var modalTitle = document.getElementById('pf-modal-title');
  var modalDesc  = document.getElementById('pf-modal-desc');

  function fixPlayPosition(el) {
    el.style.setProperty('position', 'absolute', 'important');
    el.style.setProperty('bottom',    '12px',    'important');
    el.style.setProperty('left',      '12px',    'important');
    el.style.setProperty('top',       'auto',    'important');
    el.style.setProperty('right',     'auto',    'important');
    el.style.setProperty('transform', 'none',    'important');
  }

  function fixAllPlayButtons() {
    var plays = document.querySelectorAll('.pf__play');
    for (var i = 0; i < plays.length; i++) fixPlayPosition(plays[i]);
  }

  var observer = new MutationObserver(function (mutations) {
    var needFix = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('pf__play')) {
        needFix = true; break;
      }
      if (m.type === 'childList' || m.type === 'subtree') {
        var added = m.addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains('pf__play')) { needFix = true; break; }
            if (node.querySelector && node.querySelector('.pf__play'))  { needFix = true; break; }
          }
        }
      }
      if (needFix) break;
    }
    if (needFix) fixAllPlayButtons();
  });

  observer.observe(document.body, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['style', 'class']
  });

  function scheduleFix() {
    fixAllPlayButtons();
    setTimeout(fixAllPlayButtons, 500);
    setTimeout(fixAllPlayButtons, 2000);
  }

  function toEmbedUrl(url) {
    url = (url || '').trim().replace(/\/$/, '');
    if (url.indexOf('/play/embed/') !== -1) return url;
    var m = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (m && m[1]) return 'https://rutube.ru/play/embed/' + m[1];
    return url;
  }

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str || '')));
    return d.innerHTML;
  }

  function renderCards(VIDEOS) {
    var existing = grid.querySelectorAll('.pf__card');
    for (var i = 0; i < existing.length; i++) grid.removeChild(existing[i]);

    filtered = VIDEOS.filter(function (v) {
      return currentFilter === 'all' ||
        (Array.isArray(v.category)
          ? v.category.indexOf(currentFilter) !== -1
          : v.category === currentFilter);
    });
    visibleCount = 0;

    if (filtered.length === 0) {
      emptyEl.classList.add('pf__empty--visible');
      moreBtn.classList.add('pf__more-btn--hidden');
      return;
    }
    emptyEl.classList.remove('pf__empty--visible');
    appendCards(INITIAL_VISIBLE);
  }

  function appendCards(count) {
    var to = Math.min(visibleCount + count, filtered.length);
    for (var i = visibleCount; i < to; i++) grid.appendChild(createCard(filtered[i]));
    visibleCount = to;
    updateMoreBtn();
    scheduleFix();
  }

  function createCard(video) {
    var card = document.createElement('article');
    card.className = 'pf__card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Смотреть ролик: ' + esc(video.title));
    card.innerHTML =
      '<div class="pf__thumb">' +
        '<img class="pf__thumb-img" src="' + esc(video.image) + '" alt="' + esc(video.title) + '" loading="lazy">' +
        '<span class="pf__tag">' + esc(video.tag) + '</span>' +
        '<div class="pf__play" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg></div>' +
      '</div>' +
      '<div class="pf__caption"><p class="pf__caption-title">' + esc(video.title) + '</p></div>';

    var play = card.querySelector('.pf__play');
    if (play) fixPlayPosition(play);

    card.addEventListener('click', function () { openModal(video); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(video); }
    });
    return card;
  }

  function updateMoreBtn() {
    moreBtn.classList[visibleCount >= filtered.length ? 'add' : 'remove']('pf__more-btn--hidden');
  }

  function openModal(video) {
    var iframe = document.createElement('iframe');
    iframe.src = toEmbedUrl(video.rutube);
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.setAttribute('frameborder', '0');
    iframe.title = video.fullTitle || video.title;
    while (modalVideo.firstChild) modalVideo.removeChild(modalVideo.firstChild);
    modalVideo.appendChild(iframe);
    modalTitle.textContent = video.fullTitle || video.title;
    modalDesc.innerHTML = video.fullText || '';
    overlay.classList.add('pf__modal-overlay--open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('pf__modal-overlay--open');
    document.body.style.overflow = '';
    while (modalVideo.firstChild) modalVideo.removeChild(modalVideo.firstChild);
  }

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('pf__modal-overlay--open')) closeModal();
  });

  tabsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.pf__tab');
    if (!btn) return;
    var tabs = tabsEl.querySelectorAll('.pf__tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('pf__tab--active');
      tabs[i].setAttribute('aria-selected', 'false');
    }
    btn.classList.add('pf__tab--active');
    btn.setAttribute('aria-selected', 'true');
    currentFilter = btn.dataset.filter;
    renderCards(window.__MF_VIDEOS__);
  });

  moreBtn.addEventListener('click', function () { appendCards(LOAD_MORE_COUNT); });

  // Загружаем данные из videos.json
  var JSON_URL = 'https://mustfilm-studio.github.io/mustfilm-portfolio/videos.json?v=' + Date.now();

  fetch(JSON_URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window.__MF_VIDEOS__ = data;
      renderCards(data);
    })
    .catch(function (err) {
      console.error('MustFilm portfolio: не удалось загрузить videos.json', err);
    });

})();
