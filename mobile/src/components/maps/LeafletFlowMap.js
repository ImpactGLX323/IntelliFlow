import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildHtml(flow) {
  const payload = escapeJson(flow || { geojson: { features: [] } });
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #0b1220;
        overflow: hidden;
      }
      .leaflet-container {
        background: #0b1220;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .map-badge {
        position: absolute;
        z-index: 999;
        top: 12px;
        left: 12px;
        right: 12px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        pointer-events: none;
      }
      .map-pill {
        background: rgba(8, 12, 18, 0.82);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff5ea;
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        backdrop-filter: blur(12px);
      }
      .legend {
        position: absolute;
        z-index: 999;
        bottom: 12px;
        left: 12px;
        background: rgba(8, 12, 18, 0.84);
        border: 1px solid rgba(255,255,255,0.12);
        color: #d9c9bb;
        border-radius: 16px;
        padding: 10px 12px;
        font-size: 11px;
        line-height: 1.5;
        backdrop-filter: blur(12px);
      }
      .legend strong {
        display: block;
        color: #fff5ea;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body>
    <div class="map-badge">
      <div class="map-pill">Indo-Pacific Corridor View</div>
      <div class="map-pill">Generalized traffic flow only</div>
    </div>
    <div id="map"></div>
    <div class="legend">
      <strong>Legend</strong>
      Green = Low pressure<br />
      Amber = Medium pressure<br />
      Red = High pressure<br />
      Dark red = Critical pressure<br />
      Blue lines = Regional shipping corridors
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      const flow = ${payload};
      const map = L.map('map', {
        zoomControl: false,
        attributionControl: true,
      }).setView([5.5, 103.5], 5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(map);

      const features = (flow && flow.geojson && flow.geojson.features) || [];
      const bounds = [];

      function pressureColor(status) {
        switch (status) {
          case 'LOW': return '#34d399';
          case 'MEDIUM': return '#fbbf24';
          case 'HIGH': return '#f87171';
          case 'CRITICAL': return '#991b1b';
          default: return '#94a3b8';
        }
      }

      features.forEach((feature) => {
        if (!feature || !feature.geometry || !feature.properties) return;
        const kind = feature.properties.kind;

        if (feature.geometry.type === 'LineString' && kind === 'shipping_lane') {
          const points = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          if (points.length) {
            bounds.push(...points);
            L.polyline(points, {
              color: '#38bdf8',
              weight: 4,
              opacity: 0.84,
              dashArray: '9 10',
            })
              .bindPopup(
                '<strong>' + feature.properties.route_name + '</strong><br />' +
                feature.properties.origin_region + ' to ' + feature.properties.destination_region + '<br />' +
                'Estimated vessels: ' + feature.properties.estimated_vessel_count
              )
              .addTo(map);
          }
        }

        if (feature.geometry.type === 'Point' && kind === 'malaysia_port') {
          const [lng, lat] = feature.geometry.coordinates;
          const point = [lat, lng];
          bounds.push(point);
          L.circleMarker(point, {
            radius: 9,
            color: '#0f172a',
            weight: 2,
            fillColor: pressureColor(feature.properties.pressure_status),
            fillOpacity: 0.92,
          })
            .bindPopup(
              '<strong>' + feature.properties.port_name + '</strong><br />' +
              'Status: ' + feature.properties.pressure_status + '<br />' +
              'Pressure score: ' + feature.properties.pressure_score + '<br />' +
              'Waiting: ' + feature.properties.vessels_waiting
            )
            .addTo(map);
        }
      });

      if (bounds.length) {
        map.fitBounds(bounds, {
          padding: [24, 24],
          maxZoom: 6,
        });
      }
    </script>
  </body>
</html>`;
}

export default function LeafletFlowMap({ flow, height = 360 }) {
  const html = useMemo(() => buildHtml(flow), [flow]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(154, 180, 215, 0.14)',
    backgroundColor: '#0b1220',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
});
