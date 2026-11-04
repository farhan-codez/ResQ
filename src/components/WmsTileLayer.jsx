import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

/**
 * Custom react-leaflet component that adds a Leaflet WMS tile layer.
 * Used for Sentinel Hub WMS layers (true color, NDVI/NDWI degradation).
 *
 * The `evalscript` option is base64-encoded at runtime per the Sentinel Hub WMS spec.
 */
export default function WmsTileLayer({
  baseUrl,
  layers,
  evalscript,
  visible,
  opacity = 0.85,
  attribution = 'Sentinel Hub',
}) {
  const map = useMap();

  useEffect(() => {
    if (!visible || !map) return;

    const wmsOptions = {
      layers,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      opacity,
      attribution,
      ...(evalscript ? { evalscript: btoa(unescape(encodeURIComponent(evalscript))) } : {}),
    };

    const layer = L.tileLayer.wms(baseUrl, wmsOptions);
    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, visible, baseUrl, layers, evalscript, opacity, attribution]);

  return null;
}