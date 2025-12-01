// map.js - finished sample map for Middlesex (client-only demo)
// Replace existing map.js with this file. It fetches middlesex_sample_preview.geojson.

const map = L.map('map', { zoomControl:true }).setView([42.98, -81.25], 11);

// base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: ''
}).addTo(map);

// global layers
let income100 = L.layerGroup().addTo(map);
let income150 = L.layerGroup().addTo(map);
let income200 = L.layerGroup().addTo(map);
let penetrationLayer = L.layerGroup().addTo(map);
let commercialLayer = L.markerClusterGroup();
let isoLayer = L.layerGroup().addTo(map);
let costLayer = L.layerGroup().addTo(map);

const params = {
  driverWage: 20,
  vehicleCostPerKm: 0.6,
  avgServiceMin: 5,
  avgSpeedKmph: 40
};

// --- Modern unload/cleanup handling (replace deprecated unload handlers) ---
function cleanup() {
  try {
    if (map && map.remove) map.remove();
    if (typeof income100 !== 'undefined' && income100.clearLayers) income100.clearLayers();
    if (typeof income150 !== 'undefined' && income150.clearLayers) income150.clearLayers();
    if (typeof income200 !== 'undefined' && income200.clearLayers) income200.clearLayers();
    if (typeof penetrationLayer !== 'undefined' && penetrationLayer.clearLayers) penetrationLayer.clearLayers();
    if (typeof commercialLayer !== 'undefined' && commercialLayer.clearLayers) commercialLayer.clearLayers();
    if (typeof isoLayer !== 'undefined' && isoLayer.clearLayers) isoLayer.clearLayers();
    if (typeof costLayer !== 'undefined' && costLayer.clearLayers) costLayer.clearLayers();
  } catch (e) {
    console.warn('Cleanup error', e);
  } finally {
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
}
function onPageHide(e) { cleanup(); }
function onBeforeUnload(e) { cleanup(); }
function onVisibilityChange(e) { if (document.visibilityState === 'hidden') cleanup(); }
window.addEventListener('pagehide', onPageHide, { once: true });
window.addEventListener('beforeunload', onBeforeUnload, { once: true });
document.addEventListener('visibilitychange', onVisibilityChange);

// --- Load the preview GeoJSON (use this filename exactly) ---
fetch('middlesex_sample_preview.geojson').then(r=>{
  if (!r.ok) throw new Error('Failed to load GeoJSON: ' + r.status);
  return r.json
