import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  label?: string;
  placeholder?: string;
}

export function LocationPicker({ value, onChange, label = 'Municipio / Lugar *', placeholder = 'Buscar ubicación...' }: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      const map = L.map(mapRef.current, {
        center: [2.4419, -76.6061], // Popayán default
        zoom: 10,
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // Click on map to set location
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setSelectedCoords({ lat, lng });
        updateMarker(map, L, lat, lng);
        
        // Reverse geocode
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
          const data = await res.json();
          if (data.display_name) {
            const shortName = extractShortName(data);
            setQuery(shortName);
            onChange(shortName, { lat, lng });
          }
        } catch {
          // Just use coords if reverse geocode fails
          const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setQuery(label);
          onChange(label, { lat, lng });
        }
      });

      mapInstanceRef.current = map;

      // Fix map rendering in dialog
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const updateMarker = useCallback((map: L.Map, L: typeof import('leaflet'), lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        html: `<div style="background:#6366f1;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
    map.setView([lat, lng], 14, { animate: true });
  }, []);

  const extractShortName = (data: any): string => {
    const addr = data.address || {};
    const parts: string[] = [];
    if (addr.village || addr.town || addr.city) parts.push(addr.village || addr.town || addr.city);
    if (addr.county || addr.state) parts.push(addr.county || addr.state);
    return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 2).join(',').trim();
  };

  const searchLocation = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Colombia')}&format=json&limit=5&accept-language=es&countrycodes=co`
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), 400);
  };

  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const shortName = result.display_name.split(',').slice(0, 2).join(',').trim();

    setQuery(shortName);
    setSelectedCoords({ lat, lng });
    onChange(shortName, { lat, lng });
    setShowResults(false);

    if (mapInstanceRef.current) {
      import('leaflet').then((L) => {
        updateMarker(mapInstanceRef.current!, L, lat, lng);
      });
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="pl-9 pr-8"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!isSearching && query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setQuery('');
              onChange('');
              setResults([]);
              setSelectedCoords(null);
              if (markerRef.current && mapInstanceRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
                mapInstanceRef.current.setView([2.4419, -76.6061], 10);
              }
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => handleSelectResult(r)}
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini map */}
      <div
        ref={mapRef}
        className="w-full h-[180px] rounded-lg border overflow-hidden"
        style={{ zIndex: 0 }}
      />
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        Busca una ubicación o haz clic en el mapa para seleccionar el punto
      </p>
    </div>
  );
}
