import { Trip } from './trip.model';
import { TripRepository } from './trip.repository';
import { TripChanges } from './tripChanges.model';

export const TripService = {
  async getTrips() {
    return await TripRepository.findAll();
  },

  async getTripById(id: string) {
    const user = await TripRepository.findByUserId(id);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },

  async createTrip(data: Partial<Trip>) {
    const user = await TripRepository.createTrip(data);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },

  async updateTrip(id: string, data: Partial<Trip>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return null;

    const setQuery = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');

    const values = Object.values(data);
    const trip = await TripRepository.updateTrip(id, setQuery, values);

    if (!trip) {
      throw { statusCode: 500, message: 'Update trip failed' };
    }

    return trip;
  },

  async createTripChanges(data: TripChanges) {
    const tripChanges = await TripRepository.createTripChanges(data);
    if (!tripChanges) {
      throw { statusCode: 400, message: 'Trip Changes not created' };
    }
    return tripChanges;
  },
};
