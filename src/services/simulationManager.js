// // backend/services/simulationManager.js
// const activeSimulations = new Map();

// /**
//  * @param {Object} io - Your Socket.io instance
//  * @param {string} tripId - The ID of the ride
//  * @param {Array} roadCoords - The array of {latitude, longitude}
//  * @param {number} startIndex - Where to resume from (default 0)
//  */
// export const startBackendNavigation = (io, tripId, roadCoords, startIndex = 0) => {
//     // 1. Clear existing simulation for this trip if any
//     if (activeSimulations.has(tripId)) {
//         clearInterval(activeSimulations.get(tripId));
//     }

//     let index = startIndex;

//     const interval = setInterval(() => {
//         if (index >= roadCoords.length) {
//             console.log(`🏁 Simulation finished for trip: ${tripId}`);
//             clearInterval(interval);
//             activeSimulations.delete(tripId);
//             return;
//         }

//         const current = roadCoords[index];
//         const next = roadCoords[index + 1];

//         // --- Heading Calculation ---
//         let heading = 0;
//         if (next) {
//             const dy = next.latitude - current.latitude;
//             const dx = next.longitude - current.longitude;
//             heading = (Math.atan2(dx, dy) * 180) / Math.PI;
//         }

//         // --- ETA Calculation ---
//         const remainingPoints = roadCoords.length - index;
//         const etaInMinutes = Math.ceil((remainingPoints * 2) / 60); // 2s per point

//         // 2. Emit to the specific room for this trip
//         io.to(`trip_${tripId}`).emit("updateDriverLocation", {
//             rideId: tripId,
//             latitude: current.latitude,
//             longitude: current.longitude,
//             heading: heading,
//             eta: etaInMinutes
//         });

//         // 3. (Optional but Recommended) Save last index to DB
//         // This allows the server to resume even if the server restarts!
//         // updateTripLastIndex(tripId, index);

//         index++;
//     }, 2000);

//     activeSimulations.set(tripId, interval);
// };

// export const stopBackendSimulation = (tripId) => {
//     if (activeSimulations.has(tripId)) {
//         clearInterval(activeSimulations.get(tripId));
//         activeSimulations.delete(tripId);
//     }
// };


// src/services/simulationService.js
// import { simulationRepository } from '../repositories/simulationRepository';

// export const simulationService = {
//     /**
//      * Updates the driver location in DB and notifies the user via Socket
//      */
//     async processLocationUpdate(io, tripId, lat, lng, heading) {
//         try {
//             // 1. Update the "Single Source of Truth" (Database)
//             const updatedTrip = await simulationRepository.updateDriverLocation(
//                 tripId, 
//                 lat, 
//                 lng, 
//                 heading
//             );

//             if (!updatedTrip) {
//                 console.error(`Trip ${tripId} not found during location update.`);
//                 return null;
//             }

//             // 2. Broadcast to the specific Socket.io room for this trip
//             // This ensures the User App sees the car move in real-time
//             io.to(`trip_${tripId}`).emit('updateDriverLocation', {
//                 rideId: tripId,
//                 latitude: lat,
//                 longitude: lng,
//                 heading: heading,
//                 status: updatedTrip.trip_status
//             });

//             return updatedTrip;
//         } catch (error) {
//             console.error("Error in simulationService:", error);
//             throw error;
//         }
//     }
// };