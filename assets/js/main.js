/* ═══════════════════════════════════════════════
 *  Main JS — ProPeptide
 *  Version: 1
 * ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Mobile hamburger ── */
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }

  /* ── FAQ accordion ── */
  document.querySelectorAll('[data-faq]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var answer = item.querySelector('.faq-answer');
      var isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ── Mobile dock: highlight active page ── */
  var path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.dock-item').forEach(function (item) {
    item.classList.remove('active');
    var href = item.getAttribute('href');
    if (href === path || (path === '' && href === '/')) {
      item.classList.add('active');
    }
  });

});
