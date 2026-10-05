const setupButton = document.querySelector('#copy-setup');
const copyStatus = document.querySelector('#copy-status');
if (setupButton && window.isSecureContext && navigator.clipboard) {
  setupButton.hidden = false;
  setupButton.addEventListener('click', async () => {
    setupButton.disabled = true;
    try {
      const response = await fetch('/setup.md');
      if (!response.ok) throw new Error('Setup instructions unavailable');
      await navigator.clipboard.writeText(await response.text());
      copyStatus.textContent = 'Copied. Paste the instructions into your agent conversation.';
    } catch {
      copyStatus.textContent = 'Copy unavailable. Use the Markdown download instead.';
    } finally { setupButton.disabled = false; }
  });
}
function openLinkedRecommendation() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener('hashchange', openLinkedRecommendation);
openLinkedRecommendation();
const sectionLinks = Array.from(document.querySelectorAll('.section-nav a[href^="#"]'));
const sections = sectionLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of sectionLinks) {
        const selected = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('current', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section));
}
