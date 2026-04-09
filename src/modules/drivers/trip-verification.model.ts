export type TripVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface TripVerification {
    id: string;
    driver_id: string;
    trip_id?: string;
    selfie_url: string;
    car_image_url: string;
    car_images?: string[];
    status: TripVerificationStatus;
    remarks?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateTripVerificationInput {
    driver_id: string;
    trip_id?: string;
    selfie_url: string;
    car_image_url?: string;
    car_images?: string[];
}

export interface UpdateTripVerificationInput {
    status?: TripVerificationStatus;
    remarks?: string;
}
