import { ChangeType, ChangeBy } from '../../enums/trip.enums';

export interface TripChanges {
  id?: string;
  trip_id: string;
  change_type: ChangeType;
  old_value?: JSON;
  new_value: JSON;
  changed_by: ChangeBy;
  changed_at?: Date;
  notes?: string;
}
