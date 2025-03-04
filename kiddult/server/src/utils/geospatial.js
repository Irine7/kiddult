/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} point1 - [longitude, latitude]
 * @param {Array} point2 - [longitude, latitude]
 * @returns {number} Distance in meters
 */
function calculateDistance(point1, point2) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {Array} point - [longitude, latitude]
 * @param {Array} polygon - Array of [longitude, latitude] points
 * @returns {boolean} True if point is inside polygon
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Create a circular polygon from center and radius
 * @param {Array} center - [longitude, latitude]
 * @param {number} radius - Radius in meters
 * @param {number} points - Number of points in the circle
 * @returns {Array} Array of [longitude, latitude] points
 */
function createCirclePolygon(center, radius, points = 32) {
  const [lon, lat] = center;
  const coords = [];
  
  // Convert radius from meters to degrees (approximate)
  const radiusLat = radius / 111000; // 1 degree latitude is approximately 111km
  const radiusLon = radius / (111000 * Math.cos(lat * Math.PI / 180));
  
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dx = radiusLon * Math.cos(angle);
    const dy = radiusLat * Math.sin(angle);
    coords.push([lon + dx, lat + dy]);
  }
  
  // Close the polygon
  coords.push(coords[0]);
  
  return coords;
}

module.exports = {
  calculateDistance,
  isPointInPolygon,
  createCirclePolygon
};