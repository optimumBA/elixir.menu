const guideButton = document.querySelector('#copy-guide');
const guideStatus = document.querySelector('#guide-status');
if (guideButton && window.isSecureContext && navigator.clipboard) {
  guideButton.hidden = false;
  guideButton.addEventListener('click', async () => {
    guideButton.disabled = true;
    try {
      const response = await fetch('/app-guide.md');
      if (!response.ok) throw new Error('Guide unavailable');
      await navigator.clipboard.writeText(await response.text());
      guideStatus.textContent = 'Copied. Paste the guide into your agent conversation.';
    } catch {
      guideStatus.textContent = 'Couldn’t copy the guide. Download the Markdown file instead.';
    } finally { guideButton.disabled = false; }
  });
}
