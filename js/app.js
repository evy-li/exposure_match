import { loadState } from './storage.js';

const THIRD_STOPS_PER_STOP = 3;
const ND_FACTOR_PER_THIRD_STOP = 0.3; // Not standard, but used for user-friendly ND display

const shutterSpeeds = [
  1/256000, 1/128000, 1/64000, 1/32000, 1/16000, 1/8000, 1/6400, 1/5000,
  1/4000, 1/3200, 1/2500, 1/2000, 1/1600, 1/1250, 1/1000, 1/800,
  1/640, 1/500, 1/400, 1/320, 1/250, 1/200, 1/160, 1/125,
  1/100, 1/80, 1/60, 1/50, 1/40, 1/30, 1/25, 1/20,
  1/15, 1/13, 1/10, 1/8, 1/6, 1/5, 1/4, 1/3,
  1/2.5, 1/2, 1/1.6, 1/1.3, 1, 1.3, 1.6, 2,
  2.5, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30
];

const stopSlider = document.getElementById('stopSlider');
const stopAmount = document.getElementById('stopAmount');
const ndOrGain = document.getElementById('ndOrGain');
const baseShutterSpeed = document.getElementById('baseShutterSpeed');
const calculatedShutterSpeed = document.getElementById('calculatedShutterSpeed');
const closestShutterSpeed = document.getElementById('closestShutterSpeed');
const fpsInput = document.getElementById('fps');
const shutterAngleInput = document.getElementById('shutterAngle');
const themeToggle = document.getElementById('themeToggle');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeModal = document.getElementById('closeModal');
const setFpsButton = document.getElementById('setFpsButton');
const setShutterAngleButton = document.getElementById('setShutterAngleButton');
const matchShutterAngleButton = document.getElementById('matchShutterAngleButton');
const storageToggle = document.getElementById('storageToggle');
const isoInput = document.getElementById('iso');
const setIsoButton = document.getElementById('setIsoButton');
let enablePersistentStorage = true; // Default to enabled

// Initialize with default values
fpsInput.value = 24;
shutterAngleInput.value = 172.8;
isoInput.value = 800;

// Load saved theme preference
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  themeToggle.checked = true;
}

themeToggle.addEventListener('change', () => {
  console.log('Theme Toggle Changed:', themeToggle.checked); // Debugging
  if (themeToggle.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  }
  saveState(); // Save state after theme change
});

storageToggle.addEventListener('change', () => {
  console.log('Storage Toggle Changed:', storageToggle.checked); // Debugging
  enablePersistentStorage = storageToggle.checked;
  localStorage.setItem('storageToggleState', enablePersistentStorage); // Save the toggle state
  if (!enablePersistentStorage) {
    localStorage.removeItem('exposureMatchState'); // Clear saved state when disabled
  }
});

// Sanitize and handle ISO input
setIsoButton.addEventListener('click', () => {
  if (sanitizeInput(isoInput, 12, 128000, 100)) { // Updated range to 12-128000
    console.log(`ISO set to: ${isoInput.value}`); // Debugging
    saveState(); // Save state after ISO change
  }
});

function updateSliderAria() {
  stopSlider.setAttribute('aria-valuenow', stopSlider.value);
}

function calculateShutterSpeed(fps, shutterAngle) {
  return shutterAngle / (360 * fps);
}

function adjustShutterSpeed(baseSpeed, stops) {
  return baseSpeed * Math.pow(2, stops / THIRD_STOPS_PER_STOP);
}

function findClosestShutterSpeed(speed, shutterSpeeds) {
  let closest = shutterSpeeds[0];
  let minDiff = Math.abs(speed - closest);

  for (let s of shutterSpeeds) {
    const diff = Math.abs(speed - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest;
}

function calculateNDFilter(stops) {
  const ndValue = Math.abs(stops) * ND_FACTOR_PER_THIRD_STOP;
  return ndValue.toFixed(1);
}

function formatShutterSpeed(speed) {
  if (speed < 1) {
    return `1/${Math.round(1 / speed)}`;
  } else {
    return `${speed.toFixed(2)}s`;
  }
}

function showError(message, input, defaultValue) {
  errorMessage.textContent = message;
  errorModal.style.display = 'flex';

  closeModal.onclick = () => {
    errorModal.style.display = 'none';
    input.value = defaultValue;
  };
}

function sanitizeInput(input, min, max, defaultValue) {
  const value = parseFloat(input.value);
  if (isNaN(value) || value < min || value > max) {
    showError(`Value must be between ${min} and ${max}.`, input, defaultValue);
    return false;
  }
  return true;
}

function calculateGainInDb(stops) {
  return (stops * 6).toFixed(2); // Each stop corresponds to approximately 6 dB
}

function updateShutterSpeed() {
  if (
    !sanitizeInput(fpsInput, 1, 1000, 24) ||
    !sanitizeInput(shutterAngleInput, 1, 360, 172.8)
  ) {
    return;
  }

  const fps = parseFloat(fpsInput.value);
  const shutterAngle = parseFloat(shutterAngleInput.value);

  if (isNaN(fps) || isNaN(shutterAngle) || fps <= 0 || shutterAngle <= 0) {
    baseShutterSpeed.textContent = "Invalid input: FPS and Shutter Angle must be positive numbers.";
    calculatedShutterSpeed.textContent = "";
    closestShutterSpeed.textContent = "";
    ndOrGain.textContent = "";
    return;
  }

  const baseSpeed = calculateShutterSpeed(fps, shutterAngle);
  baseShutterSpeed.textContent = formatShutterSpeed(baseSpeed);

  const stops = parseInt(stopSlider.value); // Adjusted for new range
  const newSpeed = adjustShutterSpeed(baseSpeed, stops);

  calculatedShutterSpeed.textContent = formatShutterSpeed(newSpeed);

  const closestSpeed = findClosestShutterSpeed(newSpeed, shutterSpeeds);
  closestShutterSpeed.textContent = formatShutterSpeed(closestSpeed);

  const totalStops = stops / THIRD_STOPS_PER_STOP;
  const wholeStops = Math.floor(totalStops);
  const thirdStops = Math.round((totalStops - wholeStops) * THIRD_STOPS_PER_STOP);

  stopAmount.textContent = `Stops: ${totalStops.toFixed(2)}`;
  const stopDetails = document.getElementById('stopDetails');
  stopDetails.textContent = `(${wholeStops} whole stops, ${thirdStops} third stops)`;

  if (totalStops < 0) {
    const ndValue = calculateNDFilter(totalStops);
    ndOrGain.textContent = `ND Filter: ND ${ndValue}`;
  } else if (totalStops > 0) {
    const gainInDb = calculateGainInDb(totalStops);
    ndOrGain.textContent = `Gain: +${gainInDb} dB`;
  } else {
    ndOrGain.textContent = "No ND filter or gain needed";
  }
  updateSliderAria();
  saveState(); // Save state after calculation
}

function matchShutterAngle() {
  const fps = parseFloat(fpsInput.value);
  const baseExposureTime = calculateShutterSpeed(24, 172.8); // Reference exposure time for 24fps & 172.8 degrees
  const matchedShutterAngle = baseExposureTime * 360 * fps;

  if (matchedShutterAngle < 1 || matchedShutterAngle > 360) {
    showError("Calculated shutter angle must be between 1 and 360 degrees.", shutterAngleInput, 172.8);
    return;
  }

  shutterAngleInput.value = matchedShutterAngle.toFixed(2);
  updateShutterSpeed();
}

stopSlider.addEventListener('input', () => {
  updateShutterSpeed();
  updateSliderAria();
});
stopSlider.addEventListener('change', () => {
  updateShutterSpeed();
  updateSliderAria();
});
setFpsButton.addEventListener('click', () => {
  if (sanitizeInput(fpsInput, 1, 1000, 24)) {
    updateShutterSpeed();
  }
});

setShutterAngleButton.addEventListener('click', () => {
  if (sanitizeInput(shutterAngleInput, 1, 360, 172.8)) {
    updateShutterSpeed();
  }
});

matchShutterAngleButton.addEventListener('click', matchShutterAngle);

// Remove input event listeners for fpsInput and shutterAngleInput
fpsInput.removeEventListener('input', updateShutterSpeed);
shutterAngleInput.removeEventListener('input', updateShutterSpeed);

// Load saved state on initialization
function initializeState() {
  const savedState = JSON.parse(localStorage.getItem('exposureMatchState'));
  const savedStorageToggle = localStorage.getItem('storageToggleState') === 'true';

  console.log('Initializing Storage Toggle:', savedStorageToggle); // Debugging
  storageToggle.checked = savedStorageToggle;
  enablePersistentStorage = savedStorageToggle;

  if (savedState && enablePersistentStorage) {
    if (savedState.theme === 'dark') {
      document.body.classList.add('dark-mode');
      themeToggle.checked = true;
    } else {
      document.body.classList.remove('dark-mode');
      themeToggle.checked = false;
    }

    isoInput.value = savedState.iso || 100; // Initialize ISO
    fpsInput.value = savedState.fps || 24;
    shutterAngleInput.value = savedState.shutterAngle || 172.8;
    stopSlider.value = savedState.stopSlider || 0;
  } else {
    // Initialize with default values if saving is disabled
    document.body.classList.remove('dark-mode');
    themeToggle.checked = false;
    isoInput.value = 100; // Default ISO
    fpsInput.value = 24;
    shutterAngleInput.value = 172.8;
    stopSlider.value = 0;
  }
}

// Update saveState to include ISO
function saveState() {
  localStorage.setItem('storageToggleState', enablePersistentStorage); // Always save the toggle state
  if (enablePersistentStorage) {
    const state = {
      theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
      iso: isoInput.value, // Save ISO
      fps: fpsInput.value,
      shutterAngle: shutterAngleInput.value,
      stopSlider: stopSlider.value,
    };
    localStorage.setItem('exposureMatchState', JSON.stringify(state));
  }
}

// Initialize the page state
initializeState();

updateShutterSpeed();
updateSliderAria();

function markInputSyncState(input, isSynced) {
  if (isSynced) {
    input.classList.add('synced');
    input.classList.remove('out-of-sync');
  } else {
    input.classList.add('out-of-sync');
    input.classList.remove('synced');
  }
}

function validateAndSetInput(input, variable, min, max, defaultValue) {
  const value = parseFloat(input.value);
  if (isNaN(value) || value < min || value > max) {
    showError(`Value must be between ${min} and ${max}.`, input, defaultValue);
    markInputSyncState(input, false);
    return false;
  }
  if (value !== variable) {
    markInputSyncState(input, false);
  } else {
    markInputSyncState(input, true);
  }
  return true;
}

// Update ISO input handling
setIsoButton.addEventListener('click', () => {
  if (validateAndSetInput(isoInput, parseFloat(isoInput.value), 12, 128000, 100)) {
    console.log(`ISO set to: ${isoInput.value}`); // Debugging
    markInputSyncState(isoInput, true);
    saveState(); // Save state after ISO change
  }
});

// Update FPS input handling
setFpsButton.addEventListener('click', () => {
  if (validateAndSetInput(fpsInput, parseFloat(fpsInput.value), 1, 1000, 24)) {
    updateShutterSpeed();
    markInputSyncState(fpsInput, true);
  }
});

// Update Shutter Angle input handling
setShutterAngleButton.addEventListener('click', () => {
  if (validateAndSetInput(shutterAngleInput, parseFloat(shutterAngleInput.value), 1, 360, 172.8)) {
    updateShutterSpeed();
    markInputSyncState(shutterAngleInput, true);
  }
});

// Add input event listeners to detect out-of-sync state
[fpsInput, shutterAngleInput, isoInput].forEach(input => {
  input.addEventListener('input', () => {
    markInputSyncState(input, false);
  });
});
