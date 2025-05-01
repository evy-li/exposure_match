const THIRD_STOPS_PER_STOP = 3;
const ND_FACTOR_PER_THIRD_STOP = 0.3; // Not standard, but used for user-friendly ND display

const shutterSpeeds = [
  1/8000, 1/6400, 1/5000, 1/4000, 1/3200, 1/2500, 1/2000,
  1/1600, 1/1250, 1/1000, 1/800, 1/640, 1/500, 1/400,
  1/320, 1/250, 1/200, 1/160, 1/125, 1/100, 1/80, 1/60,
  1/50, 1/40, 1/30, 1/25, 1/20, 1/15, 1/13, 1/10, 1/8,
  1/6, 1/5, 1/4, 1/3, 1/2.5, 1/2, 1/1.6, 1/1.3, 1, 1.3,
  1.6, 2, 2.5, 3, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30
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

// Initialize with default values
fpsInput.value = 24;
shutterAngleInput.value = 172.8;

// Load saved theme preference
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  themeToggle.checked = true;
}

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
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

function sanitizeInput(input, min, max) {
  const value = parseFloat(input.value);
  if (isNaN(value) || value < min) {
    input.value = min;
  } else if (value > max) {
    input.value = max;
  }
}

function updateShutterSpeed() {
  sanitizeInput(fpsInput, 1, 1000);
  sanitizeInput(shutterAngleInput, 1, 360);

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

  const stops = parseInt(stopSlider.value);
  const newSpeed = adjustShutterSpeed(baseSpeed, stops);

  calculatedShutterSpeed.textContent = formatShutterSpeed(newSpeed);

  const closestSpeed = findClosestShutterSpeed(newSpeed, shutterSpeeds);
  closestShutterSpeed.textContent = formatShutterSpeed(closestSpeed);

  const totalStops = stops / THIRD_STOPS_PER_STOP;
  const wholeStops = Math.floor(totalStops);
  const thirdStops = Math.round((totalStops - wholeStops) * THIRD_STOPS_PER_STOP);

  stopAmount.textContent = `Stops: ${totalStops.toFixed(2)} (${wholeStops} whole stops, ${thirdStops} third stops)`;

  if (totalStops < 0) {
    const ndValue = calculateNDFilter(totalStops);
    ndOrGain.textContent = `ND Filter: ND ${ndValue}`;
  } else if (totalStops > 0) {
    ndOrGain.textContent = `Gain: +${totalStops.toFixed(2)} stops`;
  } else {
    ndOrGain.textContent = "No ND filter or gain needed";
  }
  updateSliderAria();
}

stopSlider.addEventListener('input', () => {
  updateShutterSpeed();
  updateSliderAria();
});
stopSlider.addEventListener('change', () => {
  updateShutterSpeed();
  updateSliderAria();
});
fpsInput.addEventListener('input', updateShutterSpeed);
shutterAngleInput.addEventListener('input', updateShutterSpeed);

updateShutterSpeed();
updateSliderAria();
