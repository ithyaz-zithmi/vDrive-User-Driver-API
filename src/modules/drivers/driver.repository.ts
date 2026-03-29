// src/modules/drivers/driver.repository.ts
import { query } from '../../shared/database';
import {
  Driver,
  CreateDriverInput,
  UpdateDriverInput,
  Document,
  KYC,
  Credit,
  Availability,
  Performance,
  Payments,
} from './driver.model';

export const DriverRepository = {
  async create(driverData: CreateDriverInput): Promise<Driver> {
    const { getClient } = require('../../shared/database');
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Insert driver
      const driverResult = await client.query(
        `INSERT INTO drivers (
          first_name, last_name, phone_number, email, profile_pic_url, date_of_birth, gender, 
          address, role, status, kyc, onboarding_status, documents_submitted, credit, performance, payments, is_trip_verified, language, device_id, is_vibration_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          driverData.first_name,
          driverData.last_name,
          driverData.phone_number,
          driverData.email,
          driverData.profilePicUrl || null,
          driverData.date_of_birth,
          driverData.gender,
          JSON.stringify(driverData.address),
          driverData.role,
          driverData.status,
          driverData.kyc_status
            ? JSON.stringify(driverData.kyc_status)
            : '{"overallStatus": "pending", "verifiedAt": null}',
          driverData.onboarding_status || 'PHONE_VERIFIED',
          driverData.documents_submitted || false,
          driverData.credit
            ? JSON.stringify(driverData.credit)
            : '{"limit": 0, "balance": 0, "totalRecharged": 0, "totalUsed": 0, "lastRechargeAt": null}',
          driverData.performance
            ? JSON.stringify(driverData.performance)
            : '{"averageRating": 0, "totalTrips": 0, "cancellations": 0, "lastActive": null}',
          driverData.payments
            ? JSON.stringify(driverData.payments)
            : '{"totalEarnings": 0, "pendingPayout": 0, "commissionPaid": 0}',
          driverData.is_trip_verified || false,
          driverData.language || 'en',
          driverData.device_id || null,
          driverData.is_vibration_enabled ?? true,
        ]
      );

      const driver = driverResult.rows[0];
      const driverId = driver.id;

      // Insert documents if provided
      const documents = [];
      if (driverData.documents && driverData.documents.length > 0) {
        for (const doc of driverData.documents) {
          const docResult = await client.query(
            `INSERT INTO driver_documents (
              driver_id, document_type, document_number, document_url, 
              status, license_status, expiry_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
              driverId,
              doc.documentType,
              doc.documentNumber,
              JSON.stringify(doc.documentUrl),
              doc.licenseStatus || 'pending',
              doc.licenseStatus || 'pending',
              doc.expiryDate || null,
            ]
          );
          documents.push(docResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      // Return formatted driver object
      return DriverRepository.mapToDriver(driver, documents, [], [], []);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },



  async update(id: string, driverData: UpdateDriverInput): Promise<Driver | null> {
    const client = await query('BEGIN');

    try {
      // Update driver fields
      const driverFields: string[] = [];
      const driverValues: any[] = [];
      let paramCount = 1;

      if (driverData.first_name) {
        driverFields.push(`first_name = $${paramCount++}`);
        driverValues.push(driverData.first_name);
      }
      if (driverData.last_name) {
        driverFields.push(`last_name = $${paramCount++}`);
        driverValues.push(driverData.last_name);
      }
      if (driverData.full_name) {
        driverFields.push(`full_name = $${paramCount++}`);
        driverValues.push(driverData.full_name);
      }
      if (driverData.phone_number) {
        driverFields.push(`phone_number = $${paramCount++}`);
        driverValues.push(driverData.phone_number);
      }
      if (driverData.email) {
        driverFields.push(`email = $${paramCount++}`);
        driverValues.push(driverData.email);
      }
      if (driverData.profilePicUrl) {
        driverFields.push(`profile_pic_url = $${paramCount++}`);
        driverValues.push(driverData.profilePicUrl);
      }
      if (driverData.date_of_birth) {
        driverFields.push(`date_of_birth = $${paramCount++}`);
        driverValues.push(driverData.date_of_birth);
      }
      if (driverData.gender) {
        driverFields.push(`gender = $${paramCount++}`);
        driverValues.push(driverData.gender);
      }
      if (driverData.address) {
        driverFields.push(`address = $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.address));
      }
      if (driverData.role) {
        driverFields.push(`role = $${paramCount++}`);
        driverValues.push(driverData.role);
      }
      if (driverData.status) {
        driverFields.push(`status = $${paramCount++}`);
        driverValues.push(driverData.status);
      }
      if (driverData.onboarding_status) {
        driverFields.push(`onboarding_status = $${paramCount++}`);
        driverValues.push(driverData.onboarding_status);
      }
      if (driverData.documents_submitted !== undefined) {
        driverFields.push(`documents_submitted = $${paramCount++}`);
        driverValues.push(driverData.documents_submitted);
      }
      if (driverData.is_trip_verified !== undefined) {
        driverFields.push(`is_trip_verified = $${paramCount++}`);
        driverValues.push(driverData.is_trip_verified);
      }
      if (driverData.language) {
        driverFields.push(`language = $${paramCount++}`);
        driverValues.push(driverData.language);
      }
      if (driverData.is_vibration_enabled !== undefined) {
        driverFields.push(`is_vibration_enabled = $${paramCount++}`);
        driverValues.push(driverData.is_vibration_enabled);
      }
      if (driverData.fcm_token) {
        driverFields.push(`fcm_token = $${paramCount++}`);
        driverValues.push(driverData.fcm_token);
      }
      if (driverData.has_scheduled_ride !== undefined) {
        driverFields.push(`has_scheduled_ride = $${paramCount++}`);
        driverValues.push(driverData.has_scheduled_ride);
      }
      if (driverData.next_scheduled_time !== undefined) {
        driverFields.push(`next_scheduled_time = $${paramCount++}`);
        driverValues.push(driverData.next_scheduled_time);
      }

      // JSONB updates using merge operator ||
      // 🛡️ Use COALESCE to prevent NULL results when merging
      if (driverData.kyc) {
        driverFields.push(`kyc = COALESCE(kyc, '{}'::jsonb) || $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.kyc));
      }
      if (driverData.credit) {
        driverFields.push(`credit = COALESCE(credit, '{}'::jsonb) || $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.credit));
      }
      if (driverData.availability) {
        driverFields.push(`availability = COALESCE(availability, '{}'::jsonb) || $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.availability));
      }
      if (driverData.performance) {
        driverFields.push(`performance = COALESCE(performance, '{}'::jsonb) || $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.performance));
      }
      if (driverData.payments) {
        driverFields.push(`payments = COALESCE(payments, '{}'::jsonb) || $${paramCount++}`);
        driverValues.push(JSON.stringify(driverData.payments));
      }

      if (driverFields.length > 0) {
        driverValues.push(id);
        await query(
          `UPDATE drivers SET ${driverFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
          driverValues
        );
      }


      // Update documents if provided
      if (driverData.documents && driverData.documents.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        for (const doc of driverData.documents) {
          let docIdToUpdate = null;

          // 1. If valid UUID provided, try to use it
          if (doc.documentId && uuidRegex.test(doc.documentId)) {
            docIdToUpdate = doc.documentId;
          }
          // 2. If no valid UUID, try to find existing document by type
          else if (doc.documentType) {
            const existingDocResult = await query(
              'SELECT id FROM driver_documents WHERE driver_id = $1 AND document_type = $2',
              [id, doc.documentType]
            );
            if (existingDocResult.rows.length > 0) {
              docIdToUpdate = existingDocResult.rows[0].id;
            }
          }

          if (docIdToUpdate) {
            // Update existing document
            const docFields: string[] = [];
            const docValues: any[] = [];
            let dParamCount = 1;

            if (doc.documentType) {
              docFields.push(`document_type = $${dParamCount++}`);
              docValues.push(doc.documentType);
            }
            if (doc.documentNumber) {
              docFields.push(`document_number = $${dParamCount++}`);
              docValues.push(doc.documentNumber);
            }
            if (doc.documentUrl) {
              docFields.push(`document_url = $${dParamCount++}`);
              docValues.push(JSON.stringify(doc.documentUrl));
            }
            if (doc.licenseStatus !== undefined) {
              docFields.push(`license_status = $${dParamCount++}`);
              docValues.push(doc.licenseStatus === '' ? null : doc.licenseStatus);

              // Also sync with 'status' column if it's a valid enum value
              const validStatuses = ['pending', 'verified', 'rejected'];
              if (validStatuses.includes(doc.licenseStatus as string)) {
                docFields.push(`status = $${dParamCount++}`);
                docValues.push(doc.licenseStatus);
              }
            }
            if (doc.expiryDate !== undefined) {
              docFields.push(`expiry_date = $${dParamCount++}`);
              docValues.push(doc.expiryDate === '' ? null : doc.expiryDate);
            }

            if (docFields.length > 0) {
              docValues.push(docIdToUpdate);
              docValues.push(id); // Ensure document belongs to driver
              await query(
                `UPDATE driver_documents SET ${docFields.join(', ')} WHERE id = $${dParamCount} AND driver_id = $${dParamCount + 1}`,
                docValues
              );
            }
          } else {
            // Create new document
            await query(
              `INSERT INTO driver_documents (
                driver_id, document_type, document_number, document_url, 
                status, license_status, expiry_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                id,
                doc.documentType,
                doc.documentNumber,
                JSON.stringify(doc.documentUrl),
                doc.licenseStatus || 'pending',
                doc.licenseStatus || 'pending',
                doc.expiryDate || null,
              ]
            );
          }
        }
      }

      await query('COMMIT');
      return this.findById(id);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  },

  async findById(id: string): Promise<Driver | null> {
    // Get driver
    const driverResult = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (driverResult.rows.length === 0) return null;

    const driver = driverResult.rows[0];

    // Get completed trips count
    try {
      const completedTripsResult = await query(
        'SELECT COUNT(*) FROM trips WHERE driver_id = $1 AND trip_status = \'COMPLETED\'',
        [id]
      );
      driver.total_trips = parseInt(completedTripsResult.rows[0].count);
    } catch (error) {
      console.error(`Error fetching total completed trips for driver ${id}:`, error);
      driver.total_trips = 0;
    }


    // Get documents
    const documentsResult = await query('SELECT * FROM driver_documents WHERE driver_id = $1', [
      id,
    ]);
    const documents = documentsResult.rows;

    // Get recharges
    let recharges = [];
    try {
      const rechargesResult = await query(
        'SELECT * FROM driver_recharges WHERE driver_id = $1 ORDER BY created_at DESC',
        [id]
      );
      recharges = rechargesResult.rows;
    } catch (error) {
      console.error(`Error fetching recharges for driver ${id}:`, error);
    }

    // Get credit usage
    let creditUsage = [];
    try {
      const creditUsageResult = await query(
        'SELECT * FROM driver_credit_usage WHERE driver_id = $1 ORDER BY created_at DESC',
        [id]
      );
      creditUsage = creditUsageResult.rows;
    } catch (error) {
      console.error(`Error fetching credit usage for driver ${id}:`, error);
    }

    // Get active subscription
    let activeSubscription = null;
    try {
      const subscriptionResult = await query(
        `SELECT ds.*, rp.plan_name 
         FROM driver_subscriptions ds
         JOIN recharge_plans rp ON ds.plan_id = rp.id
         WHERE ds.driver_id = $1 AND ds.status = 'active'
         LIMIT 1`,
        [id]
      );
      activeSubscription = subscriptionResult.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching active subscription for driver ${id}:`, error);
    }

    // TODO: Fetch activity logs if table exists, for now pass empty
    const activityLogs: any[] = [];

    return DriverRepository.mapToDriver(
      driver,
      documents,
      recharges,
      creditUsage,
      activityLogs,
      activeSubscription
    );
  },

  async findAll(limit: number = 50, offset: number = 0): Promise<Driver[]> {
    const driversResult = await query(
      'SELECT * FROM drivers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const drivers = [];
    for (const driver of driversResult.rows) {
      try {
        const fullDriver = await DriverRepository.findById(driver.id);
        if (fullDriver) drivers.push(fullDriver);
      } catch (error) {
        console.error(`Error fetching full data for driver ${driver.id}:`, error);
        // Map basic driver data if full fetch fails to prevent breaking the whole list
        drivers.push(DriverRepository.mapToDriver(driver, [], [], [], []));
      }
    }

    return drivers;
  },

  mapToDriver(
    driver: any,
    documents: any[],
    recharges: any[],
    creditUsage: any[],
    activityLogs: any[],
    activeSubscription?: any
  ): Driver {
    const fName = driver.first_name || driver.full_name?.split(' ')[0] || '';
    const lName = driver.last_name || driver.full_name?.split(' ').slice(1).join(' ') || '';

    const safeParse = (data: any) => {
      if (!data) return null;
      if (typeof data === 'object') return data;
      try {
        return JSON.parse(data);
      } catch (e) {
        return data; // Return as is if it fails
      }
    };

    return {
      driverId: driver.id,
      first_name: fName,
      last_name: lName,
      full_name: driver.full_name,
      phone_number: driver.phone_number,
      email: driver.email,
      profilePicUrl: driver.profile_pic_url || '',
      date_of_birth: driver.date_of_birth,
      gender: driver.gender,
      address: safeParse(driver.address),
      role: driver.role,
      status: driver.status,
      rating: parseFloat(driver.rating) || 0,
      total_trips: driver.total_trips || 0,
      availability: safeParse(driver.availability),
      kyc_status: safeParse(driver.kyc),
      onboarding_status: driver.onboarding_status,
      documents_submitted: driver.documents_submitted,
      credit: safeParse(driver.credit),
      performance: safeParse(driver.performance),
      payments: safeParse(driver.payments),
      is_trip_verified: driver.is_trip_verified,
      language: driver.language || 'en',
      is_vibration_enabled: driver.is_vibration_enabled ?? true,
      fcm_token: driver.fcm_token || null,
      vdrive_id: driver.vdrive_id,
      created_at: driver.created_at,
      updated_at: driver.updated_at,
      documents: documents.map((doc) => ({
        documentId: doc.id,
        documentType: doc.document_type,
        documentNumber: doc.document_number,
        documentUrl: safeParse(doc.document_url),
        licenseStatus: doc.status || '',
        expiryDate: doc.expiry_date,
      })),
      recharges: recharges.map((r) => ({
        transactionId: r.id,
        amount: parseFloat(r.amount),
        paymentMethod: r.payment_method,
        reference: r.reference || '',
        status: r.status,
        createdAt: r.created_at,
      })),
      creditUsage: creditUsage.map((cu) => ({
        usageId: cu.id,
        tripId: cu.trip_id || '',
        amount: parseFloat(cu.amount),
        type: cu.type,
        description: cu.description || '',
        createdAt: cu.created_at,
      })),
      activityLogs: activityLogs.map((log) => ({
        logId: log.id,
        action: log.action,
        details: log.details || '',
        createdAt: log.created_at,
      })),
      subscription_details: activeSubscription ? {
        platform_subscription_id: activeSubscription.id,
        plan_name: activeSubscription.plan_name,
        billing_cycle: activeSubscription.billing_cycle,
        start_date: activeSubscription.start_date,
        expiry_date: activeSubscription.expiry_date,
        status: activeSubscription.status,
      } : undefined,
    };
  },

    async findNearbyDriversExpanding(lng: number, lat: number) {
    const radiusTiers = [500, 2000, 5000, 10000, 20000];
    let drivers = [];

    for (const radius of radiusTiers) {
      console.log(`Searching within ${radius} meters...`);

      drivers = await this.findNearbyDrivers(lng, lat, radius);

      if (drivers.length > 0) {
        return {
          drivers,
          searchedRadius: radius
        };
      }
    }
     return {
      drivers: [],
      searchedRadius: radiusTiers[radiusTiers.length - 1]
    };
  },
  async findNearbyDrivers(lng: number, lat: number, radiusMeters: number) {
    const sqlQuery = `
       SELECT
        id,
        first_name,
        last_name,
        full_name,
        current_lat,
        current_lng,
        rating,
        phone_number,
        ROUND(ST_Distance(location, ST_MakePoint($1, $2)::geography)::numeric, 0) as distance_meters
    FROM drivers
    WHERE (
        (availability::text = 'true') OR 
        (availability->>'online' = 'true')
      )
      AND status = 'active'
      AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
      -- AND last_active >= NOW() - INTERVAL '10 minutes'
    ORDER BY distance_meters ASC;
    `;
    console.log(lng, lat, radiusMeters, "lng, lat, radiusMeters")
    const { rows } = await query(sqlQuery, [lng, lat, radiusMeters]);
    return rows;
  },


  async updateLocation(id: string, lat: number, lng: number, address: string) {
    const sqlQuery = `
            UPDATE drivers 
            SET 
                current_latitude = $1, 
                current_longitude = $2, 
                current_lat = $1,
                current_lng = $2,
                location = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                current_address = $3,
                last_active = CURRENT_TIMESTAMP 
            WHERE id = $4 AND is_deleted = FALSE
            RETURNING id, full_name;
        `;

    const { rows } = await query(sqlQuery, [lat, lng, address, id]);
    return rows[0];
  },


  /**
   * Dedicated method to update only the FCM token
   */
  async updateFcmToken(driverId: string, fcmToken: string): Promise<void> {
    await query(
      'UPDATE drivers SET fcm_token = $1, updated_at = NOW() WHERE id = $2',
      [fcmToken, driverId],
    );
  },

  async recalculateDriverScheduleFlags(driverId: string): Promise<void> {
    const result = await query(
      `SELECT scheduled_start_time 
       FROM trips 
       WHERE driver_id = $1 
         AND booking_type = 'SCHEDULED' 
         AND trip_status = 'ACCEPTED' 
         AND scheduled_start_time > NOW()
       ORDER BY scheduled_start_time ASC
       LIMIT 1`,
      [driverId]
    );

    if (result.rows.length > 0) {
      await query(
        'UPDATE drivers SET has_scheduled_ride = true, next_scheduled_time = $1 WHERE id = $2',
        [result.rows[0].scheduled_start_time, driverId]
      );
    } else {
      await query(
        'UPDATE drivers SET has_scheduled_ride = false, next_scheduled_time = NULL WHERE id = $1',
        [driverId]
      );
    }
  },
};
