import type { TracePoint } from '@/lib/db';

export function buildGpx(points: TracePoint[], name: string): string {
  const trackPoints = points
    .map((point) => {
      const elevation = point.altitude !== null ? `<ele>${point.altitude.toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${point.lat}" lon="${point.lng}">${elevation}<time>${new Date(
        point.timestamp,
      ).toISOString()}</time></trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trace" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${name}</name></metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}
