// Coordinates along the paths for simulation
export interface LatLng {
  lat: number;
  lng: number;
}

export const ROUTE_1_COORDS: LatLng[] = [
  { lat: 28.6139, lng: 77.2090 }, // Delhi Start
  { lat: 28.3845, lng: 76.9744 }, // Gurugram Toll
  { lat: 27.8500, lng: 76.4000 },
  { lat: 27.3912, lng: 75.9811 }, // Shahpura Toll
  { lat: 26.9124, lng: 75.7873 }, // Jaipur
  { lat: 26.6110, lng: 74.9215 }, // Kishangarh Toll
  { lat: 25.5000, lng: 74.3000 },
  { lat: 24.5800, lng: 73.7100 }, // Udaipur
  { lat: 23.8501, lng: 73.3812 }, // Shamlaji Toll
  { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  { lat: 22.3415, lng: 73.2045 }, // Vadodara Toll
  { lat: 21.1700, lng: 72.8300 }, // Surat
  { lat: 20.0102, lng: 72.9015 }, // Charoti Toll
  { lat: 19.1500, lng: 72.9500 }, // Mumbai Entrance
  { lat: 19.0760, lng: 72.8777 }  // Mumbai JNPT End
];

export const ROUTE_2_COORDS: LatLng[] = [
  { lat: 19.0760, lng: 72.8777 }, // Mumbai Start
  { lat: 19.0200, lng: 73.1000 }, // Kalamboli Entry
  { lat: 18.8354, lng: 73.2921 }, // Khalapur Toll
  { lat: 18.7508, lng: 73.4042 }, // Lonavala
  { lat: 18.7302, lng: 73.6645 }, // Talegaon Toll
  { lat: 18.5204, lng: 73.8567 }  // Pune End
];

// Linear interpolation to generate dense coordinate path
export function interpolatePath(path: LatLng[], stepsPerSegment: number = 20): LatLng[] {
  const densePath: LatLng[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];

    for (let j = 0; j < stepsPerSegment; j++) {
      const fraction = j / stepsPerSegment;
      const lat = start.lat + (end.lat - start.lat) * fraction;
      const lng = start.lng + (end.lng - start.lng) * fraction;
      densePath.push({ lat, lng });
    }
  }

  // Add the final point
  densePath.push(path[path.length - 1]);
  return densePath;
}
