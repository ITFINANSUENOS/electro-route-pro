// Types for map components

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  user_id: string;
  user_name: string;
  fecha: string;
  hora_registro: string;
  tipo_actividad: 'punto' | 'correria' | 'libre';
  municipio: string;
  has_photo: boolean;
  has_gps: boolean;
  regional_id?: string;
  regional_name?: string;
  foto_url?: string | null;
}

export interface MapFiltersState {
  dateFrom: string;
  dateTo: string;
  regionalId: string;
  jefeId: string;
  tipoActividad: string;
}

export const MAP_CONFIG = {
  center: [2.4419, -76.6061] as [number, number], // Popayán, Colombia
  zoom: 10,
  minZoom: 6,
  maxZoom: 18,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  punto: 'Punto Fijo',
  correria: 'Correría',
  libre: 'Libre',
};
