import { query } from '../../shared/database';
import { Driver, CreateDriverInput, UpdateDriverInput, Vehicle, Document, KYC, Credit, Availability, Performance, Payments } from './driver.model';
import { AuthService } from '../auth/auth.service';

export const DriverRepository = {
  async create(driverData: CreateDriverInput): Promise<Driver> {
    const client = await query('BEGIN');

    try {
      const passwordHash = driverData.password ? await AuthService.hashPassword(driverData.password) : null;

      // Insert driver
      const driverResult = await query(
        `INSERT INTO drivers (
          full_name, phone_number, email, password, profile_pic_url, dob, gender, 
          address, role, status, kyc, credit, availability, performance, payments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          driverData.fullName,
          driverData.phoneNumber,
          driverData.email,
          passwordHash,
          driverData.profilePicUrl || null,
          driverData.dob,
          driverData.gender,
          JSON.stringify(driverData.address),
          driverData.role,
          driverData.status,
          driverData.kyc ? JSON.stringify(driverData.kyc) : '{"overallStatus": "pending", "verifiedAt": null}',
          driverData.credit ? JSON.stringify(driverData.credit) : '{"limit": 0, "balance": 0, "totalRecharged": 0, "totalUsed": 0, "lastRechargeAt": null}',
          driverData.availability ? JSON.stringify(driverData.availability) : '{"online": false, "lastActive": null}',
          driverData.performance ? JSON.stringify(driverData.performance) : '{"averageRating": 0, "totalTrips": 0, "cancellations": 0, "lastActive": null}',
          driverData.payments ? JSON.stringify(driverData.payments) : '{"totalEarnings": 0, "pendingPayout": 0, "commissionPaid": 0}',
        ]
      );

      const driver = driverResult.rows[0];
      const driverId = driver.id;

      // Insert vehicle if provided
      let vehicle = null;
      if (driverData.vehicle) {
        const vehicleResult = await query(
          `INSERT INTO vehicles (
            driver_id, vehicle_number, vehicle_model, vehicle_type, 
            fuel_type, registration_date, insurance_expiry, rc_document_url, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            driverId,
            driverData.vehicle.vehicleNumber,
            driverData.vehicle.vehicleModel,
            driverData.vehicle.vehicleType,
            driverData.vehicle.fuelType,
            driverData.vehicle.registrationDate,
            driverData.vehicle.insuranceExpiry,
            driverData.vehicle.rcDocumentUrl || null,
            driverData.vehicle.status ?? true,
          ]
        );
        vehicle = vehicleResult.rows[0];
      }

      const documents: any[] = [];
      // Documents and vehicles should be handled by their respective services
      // as part of the refactoring to separate concerns and use the driver_documents table.

      await query('COMMIT');

      // Return formatted driver object
      return DriverRepository.mapToDriver(driver, vehicle, documents, [], [], []);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  },

  async update(id: string, driverData: UpdateDriverInput): Promise<Driver | null> {
    const client = await query('BEGIN');

    try {
      // Update driver fields
      const driverFields: string[] = [];
      const driverValues: any[] = [];
      let paramCount = 1;

      if (driverData.fullName) { driverFields.push(`full_name = $${paramCount++}`); driverValues.push(driverData.fullName); }
      if (driverData.phoneNumber) { driverFields.push(`phone_number = $${paramCount++}`); driverValues.push(driverData.phoneNumber); }
      if (driverData.email) { driverFields.push(`email = $${paramCount++}`); driverValues.push(driverData.email); }
      if (driverData.password) { 
        driverFields.push(`password = $${paramCount++}`); 
        driverValues.push(await AuthService.hashPassword(driverData.password)); 
      }
      if (driverData.profilePicUrl) { driverFields.push(`profile_pic_url = $${paramCount++}`); driverValues.push(driverData.profilePicUrl); }
      if (driverData.dob) { driverFields.push(`dob = $${paramCount++}`); driverValues.push(driverData.dob); }
      if (driverData.gender) { driverFields.push(`gender = $${paramCount++}`); driverValues.push(driverData.gender); }
      if (driverData.address) { driverFields.push(`address = $${paramCount++}`); driverValues.push(JSON.stringify(driverData.address)); }
      if (driverData.role) { driverFields.push(`role = $${paramCount++}`); driverValues.push(driverData.role); }
      if (driverData.status) { driverFields.push(`status = $${paramCount++}`); driverValues.push(driverData.status); }
      
      // JSONB updates using merge operator ||
      if (driverData.kyc) { driverFields.push(`kyc = kyc || $${paramCount++}`); driverValues.push(JSON.stringify(driverData.kyc)); }
      if (driverData.credit) { driverFields.push(`credit = credit || $${paramCount++}`); driverValues.push(JSON.stringify(driverData.credit)); }
      if (driverData.availability) { driverFields.push(`availability = availability || $${paramCount++}`); driverValues.push(JSON.stringify(driverData.availability)); }
      if (driverData.performance) { driverFields.push(`performance = performance || $${paramCount++}`); driverValues.push(JSON.stringify(driverData.performance)); }
      if (driverData.payments) { driverFields.push(`payments = payments || $${paramCount++}`); driverValues.push(JSON.stringify(driverData.payments)); }

      if (driverFields.length > 0) {
        driverValues.push(id);
        await query(
          `UPDATE drivers SET ${driverFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
          driverValues
        );
      }

      // Update vehicle if provided
      if (driverData.vehicle) {
        // Check if vehicle exists
        const vehicleCheck = await query('SELECT id FROM vehicles WHERE driver_id = $1', [id]);
        
        if (vehicleCheck.rows.length > 0) {
           // Update existing vehicle
           const vehicleFields: string[] = [];
           const vehicleValues: any[] = [];
           let vParamCount = 1;
           
           if (driverData.vehicle.vehicleNumber) { vehicleFields.push(`vehicle_number = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.vehicleNumber); }
           if (driverData.vehicle.vehicleModel) { vehicleFields.push(`vehicle_model = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.vehicleModel); }
           if (driverData.vehicle.vehicleType) { vehicleFields.push(`vehicle_type = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.vehicleType); }
           if (driverData.vehicle.fuelType) { vehicleFields.push(`fuel_type = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.fuelType); }
           if (driverData.vehicle.registrationDate) { vehicleFields.push(`registration_date = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.registrationDate); }
           if (driverData.vehicle.insuranceExpiry) { vehicleFields.push(`insurance_expiry = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.insuranceExpiry); }
           if (driverData.vehicle.rcDocumentUrl) { vehicleFields.push(`rc_document_url = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.rcDocumentUrl); }
           if (driverData.vehicle.status !== undefined) { vehicleFields.push(`status = $${vParamCount++}`); vehicleValues.push(driverData.vehicle.status); }

           if (vehicleFields.length > 0) {
             vehicleValues.push(id);
             await query(
               `UPDATE vehicles SET ${vehicleFields.join(', ')} WHERE driver_id = $${vParamCount}`,
               vehicleValues
             );
           }
        } else {
          // Create new vehicle if it doesn't exist
           await query(
            `INSERT INTO vehicles (
              driver_id, vehicle_number, vehicle_model, vehicle_type, 
              fuel_type, registration_date, insurance_expiry, rc_document_url, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              driverData.vehicle.vehicleNumber,
              driverData.vehicle.vehicleModel,
              driverData.vehicle.vehicleType,
              driverData.vehicle.fuelType,
              driverData.vehicle.registrationDate,
              driverData.vehicle.insuranceExpiry,
              driverData.vehicle.rcDocumentUrl || null,
              driverData.vehicle.status ?? true,
            ]
          );
        }
      }

      // Documents should be handled by DriverDocumentsService as part of the refactor.

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

    // Get vehicle
    const vehicleResult = await query('SELECT * FROM vehicles WHERE driver_id = $1', [id]);
    const vehicle = vehicleResult.rows[0] || null;

    // Get documents
    const documentsResult = await query('SELECT * FROM driver_documents WHERE driver_id = $1', [id]);
    const documents = documentsResult.rows;

    // Get recharges
    // const rechargesResult = await query(
    //   'SELECT * FROM driver_recharges WHERE driver_id = $1 ORDER BY created_at DESC',
    //   [id]
    // );
    // const recharges = rechargesResult.rows;

    // Get credit usage
    // const creditUsageResult = await query(
    //   'SELECT * FROM driver_credit_usage WHERE driver_id = $1 ORDER BY created_at DESC',
    //   [id]
    // );
    // const creditUsage = creditUsageResult.rows;

    // Get activity logs
    // const activityLogsResult = await query(
    //   'SELECT * FROM driver_activity_logs WHERE driver_id = $1 ORDER BY created_at DESC',
    //   [id]
    // );
    // const activityLogs = activityLogsResult.rows;

    return DriverRepository.mapToDriver(driver, vehicle, documents, [], [], []);
  },

  async findAll(limit: number = 50, offset: number = 0): Promise<Driver[]> {
    const driversResult = await query(
      'SELECT * FROM drivers ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const drivers = [];
    for (const driver of driversResult.rows) {
      const fullDriver = await DriverRepository.findById(driver.id);
      if (fullDriver) drivers.push(fullDriver);
    }

    return drivers;
  },

  mapToDriver(
    driver: any,
    vehicle: any,
    documents: any[],
    recharges: any[],
    creditUsage: any[],
    activityLogs: any[]
  ): Driver {
    return {
      driverId: driver.id,
      fullName: driver.full_name,
      phoneNumber: driver.phone_number,
      email: driver.email,
      profilePicUrl: driver.profile_pic_url || '',
      dob: driver.dob,
      gender: driver.gender,
      address: driver.address,
      role: driver.role,
      status: driver.status,
      rating: parseFloat(driver.rating) || 0,
      totalTrips: driver.total_trips || 0,
      availability: driver.availability,
      kyc: driver.kyc,
      credit: driver.credit,
      performance: driver.performance,
      payments: driver.payments,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at,
      vehicle: vehicle
        ? {
            vehicleId: vehicle.id,
            vehicleNumber: vehicle.vehicle_number,
            vehicleModel: vehicle.vehicle_model,
            vehicleType: vehicle.vehicle_type,
            fuelType: vehicle.fuel_type,
            registrationDate: vehicle.registration_date,
            insuranceExpiry: vehicle.insurance_expiry,
            rcDocumentUrl: vehicle.rc_document_url || '',
            status: vehicle.status,
          }
        : null,
      documents: documents.map((doc) => ({
        documentId: doc.id,
        documentType: doc.document_type,
        documentNumber: doc.metadata?.document_number || '',
        documentUrl: doc.document_url,
        licenseStatus: doc.metadata?.license_status || '',
        expiryDate: doc.metadata?.expiry_date || '',
      })),
      // recharges: recharges.map((r) => ({
      //   transactionId: r.id,
      //   amount: parseFloat(r.amount),
      //   paymentMethod: r.payment_method,
      //   reference: r.reference || '',
      //   status: r.status,
      //   createdAt: r.created_at,
      // })),
      // creditUsage: creditUsage.map((cu) => ({
      //   usageId: cu.id,
      //   tripId: cu.trip_id || '',
      //   amount: parseFloat(cu.amount),
      //   type: cu.type,
      //   description: cu.description || '',
      //   createdAt: cu.created_at,
      // })),
      // activityLogs: activityLogs.map((log) => ({
      //   logId: log.id,
      //   action: log.action,
      //   details: log.details || '',
      //   createdAt: log.created_at,
      // })),
      // recharges: [],
      // creditUsage: [],
      // activityLogs: [],
    };
  },
};
