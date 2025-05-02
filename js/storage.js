export function saveState() {
  const state = {
    theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
    fps: document.getElementById('fps').value,
    shutterAngle: document.getElementById('shutterAngle').value,
    stopSlider: document.getElementById('stopSlider').value,
    iso: document.getElementById('iso').value, // Save ISO
  };
  localStorage.setItem('exposureMatchState', JSON.stringify(state));
}

export function loadState() {
  const state = JSON.parse(localStorage.getItem('exposureMatchState'));
  if (state) {
    if (state.theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.getElementById('themeToggle').checked = true;
    } else {
      document.body.classList.remove('dark-mode');
      document.getElementById('themeToggle').checked = false;
    }

    document.getElementById('fps').value = state.fps || 24;
    document.getElementById('shutterAngle').value = state.shutterAngle || 172.8;
    document.getElementById('stopSlider').value = state.stopSlider || 0;
    document.getElementById('iso').value = state.iso || 100; // Load ISO
  }
}
