import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MapPin, Navigation, Check, X, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: Location) => void;
  initialLocation?: Location | null;
}

export function LocationPicker({ open, onClose, onSelect, initialLocation }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Default to Tanzania (Zanzibar area)
  const defaultCenter: [number, number] = [-6.1659, 39.2026];
  const defaultZoom = 13;

  useEffect(() => {
    if (!open || !mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(
      initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter,
      initialLocation ? 16 : defaultZoom
    );

    // Add OpenStreetMap tiles (works offline if cached)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add initial marker if location exists
    if (initialLocation) {
      const marker = L.marker([initialLocation.lat, initialLocation.lng]).addTo(map);
      markerRef.current = marker;
      setSelectedLocation(initialLocation);
    }

    // Click handler to place marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      const marker = L.marker([lat, lng]).addTo(map);
      markerRef.current = marker;

      setSelectedLocation({ lat, lng });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, initialLocation]);

  // Reset map instance when dialog closes
  useEffect(() => {
    if (!open) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    }
  }, [open]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);

          // Remove existing marker
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Add new marker
          const marker = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
          markerRef.current = marker;

          setSelectedLocation({ lat: latitude, lng: longitude });
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please select manually on the map.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Select Household Location
          </DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        <div className="px-4 pb-2">
          <p className="text-sm text-slate-500">
            Tap on the map to mark the household location, or use your current location.
          </p>
        </div>

        {/* Map Container */}
        <div className="relative h-72 bg-slate-100">
          <div ref={mapRef} className="absolute inset-0 z-0" />

          {/* Current Location Button */}
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 z-10 shadow-lg"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
            <p className="text-sm text-emerald-700">
              <span className="font-medium">Selected:</span>{' '}
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        )}

        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedLocation}>
            <Check className="w-4 h-4 mr-2" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
