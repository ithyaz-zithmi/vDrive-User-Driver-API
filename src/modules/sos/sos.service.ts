import axios from 'axios';
import config from '../../config';
import { getIO, emitToRoom, emitToAll } from '../../shared/socket';
import { logger } from '../../shared/logger';
import { SosRepository } from './sos.repository';
import { DriverRepository } from '../drivers/driver.repository';
import { TripRepository } from '../trip/trip.repository';

export class SosService {
  static async triggerSos(user_id: string, user_type: 'driver' | 'user', trip_id?: string) {
    // 1. Check if SOS already active for this user
    let sosEvent = await SosRepository.findActiveSosByUser(user_id, user_type);
    if (sosEvent) {
      return sosEvent;
    }

    // 2. Create new SOS event
    sosEvent = await SosRepository.createSosEvent(user_id, user_type, trip_id);

    // 3. Fetch Enriched Data for Alerting
    let enrichedUserData: any = null;

    if (user_type === 'driver') {
      const driver = await DriverRepository.findById(user_id);
      if (driver) {
        enrichedUserData = {
          full_name: driver.full_name || `${driver.first_name} ${driver.last_name}`,
          phone_number: driver.phone_number,
          vdrive_id: driver.vdrive_id,
          type: 'driver'
        };
      }
    } else {
      // For user type, we can add user lookup here if needed
      enrichedUserData = {
        user_id,
        type: 'user'
      };
    }

    const trip = trip_id ? await TripRepository.findById(trip_id) : null;

    const enrichedData = {
      ...sosEvent,
      user: enrichedUserData,
      trip: trip ? {
        pickup_address: trip.pickup_address,
        drop_address: trip.drop_address,
        status: trip.trip_status
      } : null
    };

    // 4. Emit via Socket.io
    const io = getIO();
    // Confirm to the user/driver
    io.to(`${user_type}_${user_id}`).emit('sos_triggered', sosEvent);
    
    // Notify trip room if applicable
    if (trip_id) {
        io.to(`trip_${trip_id}`).emit('sos_triggered', sosEvent);
    }

    // Notify all admins for real-time monitoring
    io.to('admins').emit('admin_sos_alert', enrichedData);

    // 5. Trigger Webhook to Admin Backend
    try {
      await this.sendWebhookWithRetry('SOS_TRIGGERED', `${user_type} has triggered an SOS alert!`, enrichedData);
      logger.info(`SOS webhook sent to Admin Backend for SOS ID: ${sosEvent.id}`);
    } catch (error) {
      logger.error('Failed to send SOS webhook to Admin Backend after retries:', error);
    }

    // 6. Logic for SMS to trusted contacts (hook)
    const contacts = await SosRepository.getTrustedContacts(user_id, user_type);
    this.sendSmsToContacts(contacts, sosEvent);

    return enrichedData;
  }

  static async updateLocation(sos_id: string, latitude: number, longitude: number) {
    await SosRepository.addSosLocation(sos_id, latitude, longitude);

    const updatePayload = {
      sos_id,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    // Emit real-time location to any tracking admin/user
    emitToRoom(`sos_${sos_id}`, 'sos_location_update', updatePayload);
    // Also notify general admin room
    emitToRoom('admins', 'admin_sos_location_update', updatePayload);

    // Notify Admin Backend via Webhook
    try {
      await this.sendWebhookWithRetry('SOS_LOCATION_UPDATE', 'SOS location updated', updatePayload);
    } catch (error) {
      logger.error('Failed to send SOS location webhook:', error);
    }
  }

  static async resolveSos(sos_id: string) {
    await SosRepository.resolveSosEvent(sos_id);
    
    // Notify all parties using safe helpers (won't throw if socket not ready)
    emitToAll('sos_resolved', { sos_id });
    emitToRoom('admins', 'admin_sos_resolved', { sos_id });

    // Notify Admin Backend
     try {
      await this.sendWebhookWithRetry('SOS_RESOLVED', 'SOS alert has been resolved.', { sos_id });
    } catch (error) {
      logger.error('Failed to send SOS resolve webhook:', error);
    }
  }

  private static async sendWebhookWithRetry(eventType: string, message: string, data: any, retries = 3) {
    const url = `${config.adminBackendUrl || 'http://localhost:3000'}/api/webhooks/driver-events`;
    const payload = { eventType, message, data };
    const headers = { 'x-api-key': config.internalServiceApiKey };

    for (let i = 0; i < retries; i++) {
      try {
        await axios.post(url, payload, { headers });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        logger.warn(`Webhook attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }

  private static async sendSmsToContacts(contacts: any[], sosEvent: any) {
    // Placeholder for actual SMS integration
    logger.info(`[SMS STUB] Sending SOS alerts to ${contacts.length} trusted contacts for User ID: ${sosEvent.user_id}`);
    contacts.forEach(contact => {
      logger.info(`[SMS STUB] Sending to ${contact.phone}: "Emergency! ${contact.name}, someone you know has triggered an SOS. Track: [link]"`);
    });
  }
}
