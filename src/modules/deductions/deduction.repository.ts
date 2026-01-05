// src/modules/deductions/deduction.repository.ts
import { query } from '../../shared/database';
import { Deduction, CreateDeductionInput, DeductionStats } from './deduction.model';

export const DeductionRepository = {
  async create(data: CreateDeductionInput): Promise<Deduction> {
    const result = await query(
      `INSERT INTO deductions (
        driver_id, driver_name, driver_phone, amount, trip_id, 
        type, balance_before, balance_after, status, reference, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.driverId,
        data.driverName,
        data.driverPhone,
        data.amount,
        data.tripId || null,
        data.type,
        data.balanceBefore,
        data.balanceAfter,
        data.status || 'Pending',
        data.reference || null,
        data.performedBy || 'Admin'
      ]
    );

    return this.mapToDeduction(result.rows[0]);
  },

  async findAll(filters: { search?: string; status?: string; type?: string } = {}): Promise<Deduction[]> {
    let sql = 'SELECT * FROM deductions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.search) {
      sql += ` AND (
        driver_name ILIKE $${paramCount} OR 
        driver_id::text ILIKE $${paramCount} OR 
        reference ILIKE $${paramCount} OR
        id::text ILIKE $${paramCount}
      )`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.status) {
      sql += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.type) {
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows.map(row => this.mapToDeduction(row));
  },

  async findById(id: string): Promise<Deduction | null> {
    const result = await query('SELECT * FROM deductions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapToDeduction(result.rows[0]);
  },

  async getStats(): Promise<DeductionStats> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN type = 'Commission' THEN amount ELSE 0 END) as total_commission,
        SUM(CASE WHEN type = 'Manual Adjustment' THEN amount ELSE 0 END) as manual_adjustments,
        SUM(CASE WHEN type = 'Refund' THEN amount ELSE 0 END) as total_refunds,
        SUM(CASE WHEN type = 'Penalty' THEN amount ELSE 0 END) as total_penalties,
        SUM(amount) as net_amount
      FROM deductions
      WHERE status = 'Success'
    `);

    const stats = result.rows[0];
    const formatCurrency = (val: any) => `\$${(parseFloat(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return {
      totalDeductions: stats.total_count.toString(),
      totalCommission: formatCurrency(stats.total_commission),
      manualAdjustments: formatCurrency(stats.manual_adjustments),
      totalRefunds: formatCurrency(stats.total_refunds),
      totalPenalties: formatCurrency(stats.total_penalties),
      netDeductionAmount: formatCurrency(stats.net_amount),
    };
  },

  mapToDeduction(row: any): Deduction {
    return {
      id: row.id,
      driverId: row.driver_id,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      amount: parseFloat(row.amount),
      tripId: row.trip_id,
      type: row.type,
      balanceBefore: parseFloat(row.balance_before),
      balanceAfter: parseFloat(row.balance_after),
      status: row.status,
      date: row.created_at,
      reference: row.reference,
      performedBy: row.performed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
};
