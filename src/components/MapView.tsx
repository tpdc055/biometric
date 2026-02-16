import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db, type Household, type Citizen } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  MapPin,
  Search,
  Users,
  Home,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Locate,
  X,
  ChevronRight,
  Building2,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  open: boolean;
  onClose: () => void;
}

interface HouseholdWithDetails extends Household {
  ward?: { id: number; name: string; code: string };
  village?: { id: number; name: string; code: string };
  citizenCount: number;
}

// Map controls component
function MapControls({ onLocate }: { onLocate: () => void }) {
  const map = useMap();

  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 bg-white shadow-md"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 bg-white shadow-md"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 bg-white shadow-md"
        onClick={onLocate}
      >
        <Locate className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Component to handle map updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

export function MapView({ open, onClose }: MapViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdWithDetails | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.7924, 39.2083]); // Default: Dar es Salaam
  const [mapZoom, setMapZoom] = useState(12);
  const [showList, setShowList] = useState(true);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Data queries
  const households = useLiveQuery(() => db.households.toArray());
  const villages = useLiveQuery(() => db.villages.toArray());
  const wards = useLiveQuery(() => db.wards.toArray());
  const citizens = useLiveQuery(() => db.citizens.toArray());

  // Get households with location data and details
  const householdsWithDetails = useMemo(() => {
    if (!households || !villages || !wards || !citizens) return [];

    return households
      .filter(h => h.latitude && h.longitude)
      .map(h => {
        const village = villages.find(v => v.id === h.villageId);
        const ward = village ? wards.find(w => w.id === village.wardId) : undefined;
        const citizenCount = citizens.filter(c => c.householdId === h.id).length;

        return {
          ...h,
          village,
          ward,
          citizenCount,
        } as HouseholdWithDetails;
      });
  }, [households, villages, wards, citizens]);

  // Filter by search
  const filteredHouseholds = useMemo(() => {
    if (!searchQuery.trim()) return householdsWithDetails;

    const query = searchQuery.toLowerCase();
    return householdsWithDetails.filter(h =>
      h.headName.toLowerCase().includes(query) ||
      h.code.toLowerCase().includes(query) ||
      h.village?.name.toLowerCase().includes(query) ||
      h.ward?.name.toLowerCase().includes(query) ||
      h.locationDescription?.toLowerCase().includes(query)
    );
  }, [householdsWithDetails, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: households?.length || 0,
    withLocation: householdsWithDetails.length,
    citizens: citizens?.length || 0,
  }), [households, householdsWithDetails, citizens]);

  // Get user's current location
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  }, []);

  // Center map on household
  const focusHousehold = useCallback((household: HouseholdWithDetails) => {
    if (household.latitude && household.longitude) {
      setMapCenter([household.latitude, household.longitude]);
      setMapZoom(17);
      setSelectedHousehold(household);
      setShowList(false);
    }
  }, []);

  // Get citizens for selected household
  const selectedCitizens = useMemo(() => {
    if (!selectedHousehold || !citizens) return [];
    return citizens.filter(c => c.householdId === selectedHousehold.id);
  }, [selectedHousehold, citizens]);

  // Tile layer URLs
  const tileUrls = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-[80vh]">
          {/* Header */}
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Household Map
                </h2>
                <p className="text-sm text-slate-500">
                  {stats.withLocation} of {stats.total} households have location data
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapStyle(mapStyle === "street" ? "satellite" : "street")}
                >
                  <Layers className="w-4 h-4 mr-1" />
                  {mapStyle === "street" ? "Satellite" : "Street"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search households..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Map and List Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar list */}
            {showList && (
              <div className="w-72 border-r bg-white flex flex-col">
                <div className="p-2 border-b bg-slate-50">
                  <p className="text-xs font-medium text-slate-600">
                    {filteredHouseholds.length} locations
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {filteredHouseholds.map((household) => (
                      <button
                        key={household.id}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedHousehold?.id === household.id
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                        }`}
                        onClick={() => focusHousehold(household)}
                      >
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-medium text-slate-800 truncate">
                            {household.headName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {household.code}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {household.citizenCount} members
                          </span>
                        </div>
                        {household.village && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {household.village.name}, {household.ward?.name}
                          </p>
                        )}
                      </button>
                    ))}

                    {filteredHouseholds.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No locations found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Map */}
            <div className="flex-1 relative">
              {/* Toggle list button */}
              <Button
                size="icon"
                variant="secondary"
                className="absolute left-3 top-3 z-[1000] h-9 w-9 bg-white shadow-md"
                onClick={() => setShowList(!showList)}
              >
                {showList ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                zoomControl={false}
              >
                <TileLayer
                  url={tileUrls[mapStyle]}
                  attribution={
                    mapStyle === "street"
                      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      : '&copy; Esri'
                  }
                />

                <MapUpdater center={mapCenter} zoom={mapZoom} />
                <MapControls onLocate={handleLocate} />

                {/* User location marker */}
                {userLocation && (
                  <CircleMarker
                    center={userLocation}
                    radius={8}
                    pathOptions={{
                      fillColor: "#3b82f6",
                      fillOpacity: 1,
                      color: "#fff",
                      weight: 2,
                    }}
                  >
                    <Popup>Your location</Popup>
                  </CircleMarker>
                )}

                {/* Household markers */}
                {filteredHouseholds.map((household) => (
                  <Marker
                    key={household.id}
                    position={[household.latitude!, household.longitude!]}
                    eventHandlers={{
                      click: () => setSelectedHousehold(household),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-bold text-slate-800">{household.headName}</h3>
                        <p className="text-sm text-slate-600">{household.code}</p>
                        {household.village && (
                          <p className="text-xs text-slate-500 mt-1">
                            {household.village.name}, {household.ward?.name}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-emerald-600">
                          <Users className="w-3 h-3" />
                          <span className="text-xs font-medium">{household.citizenCount} members</span>
                        </div>
                        {household.locationDescription && (
                          <p className="text-xs text-slate-500 mt-1 border-t pt-1">
                            {household.locationDescription}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Selected household details panel */}
          {selectedHousehold && !showList && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 max-h-48 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Home className="w-4 h-4 text-emerald-600" />
                    {selectedHousehold.headName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedHousehold.village?.name}, {selectedHousehold.ward?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedHousehold(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {selectedCitizens.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    Household Members ({selectedCitizens.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCitizens.map((citizen) => (
                      <Badge key={citizen.id} variant="secondary" className="text-xs">
                        {citizen.firstName} {citizen.lastName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedHousehold.locationDescription && (
                <p className="text-xs text-slate-500 mt-2 pt-2 border-t">
                  <Navigation className="w-3 h-3 inline mr-1" />
                  {selectedHousehold.locationDescription}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
