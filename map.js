// map.js - finished sample map for Middlesex (client-only demo)
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

// load sample GeoJSON
fetch('middlesex_sample.geojson').then(r=>r.json()).then(data=>{
  const fsas = data.fsas;
  const commercial = data.commercial;
  const stores = data.stores;

  // draw FSAs with income thresholds and penetration
  fsas.features.forEach(f => {
    const p = f.properties;
    const baseStyle = { weight:1, color:'#222', fillOpacity:0.45 };
    const popup = `<b>${p.FSA}</b><br>Income: $${p.avg_income.toLocaleString()}<br>Households: ${p.households}<br>Customers: ${p.customers}<br>Penetration: ${p.penetration.toFixed(2)}%`;
    const layer = L.geoJSON(f, { style: baseStyle }).bindPopup(popup).on('click', ()=> showFsaInfo(p));
    // income layers
    if (p.avg_income >= 100000) layer.addTo(income100);
    if (p.avg_income >= 150000) layer.addTo(income150);
    if (p.avg_income >= 200000) layer.addTo(income200);
    // penetration choropleth
    const penColor = penetrationColor(p.penetration);
    const penStyle = { color:'#111', weight:1, fillColor:penColor, fillOpacity:0.6 };
    L.geoJSON(f, { style: penStyle }).bindTooltip(`${p.FSA} ${p.penetration.toFixed(2)}%`).addTo(penetrationLayer);
  });

  // commercial points
  commercial.features.forEach(pt=>{
    const p = pt.properties;
    const icon = L.divIcon({ className:'ch-icon', html:`<div style="background:#ffbf00;padding:6px;border-radius:8px;color:#111;font-weight:700">${p.type[0]}</div>`, iconSize:[28,28] });
    const marker = L.marker([pt.geometry.coordinates[1], pt.geometry.coordinates[0]], { icon }).bindPopup(`<b>${p.name}</b><br>${p.type}`);
    commercialLayer.addLayer(marker);
  });
  commercialLayer.addTo(commercialLayer._map || map);
  map.addLayer(commercialLayer);

  // stores and sample isochrones (static sample polygons)
  stores.forEach(s=>{
    L.circleMarker([s.lat,s.lon], { radius:8, fillColor:'#ff7a18', color:'#fff', weight:1, fillOpacity:1 }).addTo(map).bindPopup(`<b>${s.name}</b>`);
    // sample isochrone polygons (static for demo)
    const iso5 = turf.circle([s.lon,s.lat], 5/60, { steps:64, units:'degrees' });
    const iso10 = turf.circle([s.lon,s.lat], 10/60, { steps:64, units:'degrees' });
    L.geoJSON(iso10, { style:{ color:'#0ea5a4', weight:1, fillOpacity:0.08 } }).addTo(isoLayer);
    L.geoJSON(iso5, { style:{ color:'#06b6d4', weight:1, fillOpacity:0.12 } }).addTo(isoLayer);
  });

  // delivery cost heatmap (per FSA centroid)
  fsas.features.forEach(f=>{
    const p = f.properties;
    const centroid = turf.centroid(f).geometry.coordinates;
    const distKm = turf.distance(centroid, [stores[0].lon, stores[0].lat], { units:'kilometers' });
    const cost = estimateCost(distKm, params);
    const circle = L.circle([centroid[1], centroid[0]], { radius: 400, color: costColor(cost), fillOpacity:0.35 }).bindPopup(`Est cost: $${cost.toFixed(2)}<br>Avg order: $${p.avg_order_value}`);
    circle.addTo(costLayer);
  });

  // initial layer visibility wiring
  document.getElementById('layer-income-100').addEventListener('change', e=> toggleLayer(income100, e.target.checked));
  document.getElementById('layer-income-150').addEventListener('change', e=> toggleLayer(income150, e.target.checked));
  document.getElementById('layer-income-200').addEventListener('change', e=> toggleLayer(income200, e.target.checked));
  document.getElementById('layer-penetration').addEventListener('change', e=> toggleLayer(penetrationLayer, e.target.checked));
  document.getElementById('layer-commercial').addEventListener('change', e=> toggleLayer(commercialLayer, e.target.checked));
  document.getElementById('layer-iso').addEventListener('change', e=> toggleLayer(isoLayer, e.target.checked));
  document.getElementById('layer-cost').addEventListener('change', e=> toggleLayer(costLayer, e.target.checked));

  document.getElementById('recalc').addEventListener('click', ()=>{
    params.driverWage = Number(document.getElementById('param-wage').value);
    params.vehicleCostPerKm = Number(document.getElementById('param-veh').value);
    params.avgServiceMin = Number(document.getElementById('param-service').value);
    // simple recompute: clear costLayer and redraw
    costLayer.clearLayers();
    fsas.features.forEach(f=>{
      const centroid = turf.centroid(f).geometry.coordinates;
      const distKm = turf.distance(centroid, [stores[0].lon, stores[0].lat], { units:'kilometers' });
      const cost = estimateCost(distKm, params);
      const circle = L.circle([centroid[1], centroid[0]], { radius: 400, color: costColor(cost), fillOpacity:0.35 }).bindPopup(`Est cost: $${cost.toFixed(2)}`);
      circle.addTo(costLayer);
    });
  });

});

// helpers
function toggleLayer(layer, show) {
  if (show) map.addLayer(layer); else map.removeLayer(layer);
}
function penetrationColor(v){
  return v > 12 ? '#7f1d1d' : v > 6 ? '#f97316' : v > 3 ? '#f59e0b' : v > 1 ? '#60a5fa' : '#06b6d4';
}
function costColor(c){
  return c > 12 ? '#7f1d1d' : c > 8 ? '#f97316' : c > 4 ? '#f59e0b' : '#10b981';
}
function showFsaInfo(p){
  const el = document.getElementById('info-content');
  el.innerHTML = `<b>${p.FSA}</b><br>Avg income: $${p.avg_income.toLocaleString()}<br>Penetration: ${p.penetration.toFixed(2)}%<br>Avg order: $${p.avg_order_value}`;
}
function estimateCost(distance_km, pr){
  const driverCostPerKm = (pr.driverWage / pr.avgSpeedKmph);
  const distanceFactor = driverCostPerKm + pr.vehicleCostPerKm;
  const baseStopCost = (pr.driverWage * (pr.avgServiceMin/60));
  return +(baseStopCost + distanceFactor * distance_km).toFixed(2);
}
