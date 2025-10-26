// Web Mercator tile math
const PI = Math.PI;

export function latLngToTile(lat: number, lng: number, zoom: number) {
  const z = zoom;
  const x = ((lng + 180) / 360) * Math.pow(2, z);
  const latRad = (lat * PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / PI) / 2) * Math.pow(2, z);
  return { z, x, y };
}

export function tileToLatLng(x: number, y: number, z: number) {
  const n = Math.pow(2, z);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / PI;
  return { lat, lng };
}

export function tileBounds(z: number, x: number, y: number) {
  const nw = tileToLatLng(x, y, z);
  const se = tileToLatLng(x + 1, y + 1, z);
  return { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng };
}

export function isValidTileCoord(z: number, x: number, y: number) {
  if (z < 0 || z > 20) return false;
  const max = Math.pow(2, z);
  return x >= 0 && y >= 0 && x < max && y < max;
}
