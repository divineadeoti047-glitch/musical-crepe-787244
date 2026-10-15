(() => {
  let installPrompt;
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function updateButtons() {
    document.querySelectorAll('[data-install]').forEach(button => {
      button.hidden = installed();
    });
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener('appinstalled', () => { installPrompt = null; updateButtons(); });
  function instructions() {
    let dialog = document.getElementById('install-help');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'install-help';
      dialog.setAttribute('aria-labelledby', 'install-heading');
      dialog.innerHTML = '<h2 id="install-heading">Take DAYSTAR with you.</h2><p>On iPhone or iPad, open DAYSTAR in Safari, tap Share, then choose Add to Home Screen.</p><p>On Android, use Chrome’s menu and choose Install app or Add to Home screen. On desktop, look for the install icon in the address bar or browser menu.</p><p>If installation isn’t available, you can still use the workspace in your browser. Open it online once before using it offline. Your records remain in the browser where you created them.</p><form method="dialog"><button>Got it</button></form>';
      document.body.appendChild(dialog);
      dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    }
    dialog.showModal();
  }
  document.querySelectorAll('[data-install]').forEach(button => button.addEventListener('click', async () => {
    if (!installPrompt) return instructions();
    const prompt = installPrompt;
    installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { instructions(); }
  }));
  updateButtons();
  if ('serviceWorker' in navigator && window.isSecureContext) {
    const indicator = document.createElement('p');
    indicator.setAttribute('role', 'status');
    indicator.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:1000;margin:0;padding:8px 12px;border-radius:8px;background:#273d32;color:#fff;font:12px system-ui;max-width:280px';
    document.body.appendChild(indicator);
    let ready = false;
    const showStatus = () => {
      indicator.textContent = ready
        ? (navigator.onLine ? 'Ready for offline use' : 'Offline · Your local workspace is available')
        : (navigator.onLine ? 'Preparing offline access…' : 'Offline access is not ready. Connect and reopen DAYSTAR.');
    };
    const checkReady = () => {
      const worker = navigator.serviceWorker.controller;
      if (!worker) return;
      const channel = new MessageChannel();
      channel.port1.onmessage = event => {
        ready = event.data.ready === true;
        showStatus();
        channel.port1.close();
      };
      worker.postMessage({type: 'CHECK_OFFLINE'}, [channel.port2]);
    };
    showStatus();
    window.addEventListener('online', showStatus);
    window.addEventListener('offline', showStatus);
    navigator.serviceWorker.addEventListener('controllerchange', checkReady);
    navigator.serviceWorker.register('/service-worker.js', {updateViaCache: 'none'})
      .then(() => navigator.serviceWorker.ready).then(checkReady)
      .catch(() => { indicator.textContent = 'Offline setup failed. Reconnect and reopen DAYSTAR.'; });
  }
})();
