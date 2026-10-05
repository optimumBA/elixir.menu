const settings = document.currentScript?.dataset;
if (settings?.script && location.origin === settings.origin && location.pathname === '/') {
  const scriptURL = new URL(settings.script);
  if (scriptURL.origin === 'https://plausible.io' && scriptURL.pathname.startsWith('/js/')) {
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible.init = window.plausible.init || function (options) {
      window.plausible.o = options;
    };
    window.plausible.init({
      fileDownloads: false,
      outboundLinks: false,
      formSubmissions: false,
      captureOnLocalhost: false,
      autoCapturePageviews: true,
    });
    const tracker = document.createElement('script');
    tracker.async = true;
    tracker.src = scriptURL.href;
    document.head.appendChild(tracker);
  }
}
