export interface TrustedContact {
  id?: number;
  driver_id: string;
  name: string;
  phone: string;
  created_at?: Date;
}

export interface SosEvent {
  id: string;
  driver_id: string;
  trip_id?: string;
  status: 'ACTIVE' | 'RESOLVED';
  created_at: Date;
  resolved_at?: Date;
}

export interface SosLocation {
  id?: number;
  sos_id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}
