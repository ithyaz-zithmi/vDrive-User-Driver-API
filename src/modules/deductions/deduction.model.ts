// src/modules/deductions/deduction.model.ts

export enum DeductionStatus {
  SUCCESS = 'Success',
  PENDING = 'Pending',
  FAILED = 'Failed',
}

export enum DeductionType {
  COMMISSION = 'Commission',
  PENALTY = 'Penalty',
  MANUAL_ADJUSTMENT = 'Manual Adjustment',
  REFUND = 'Refund',
}

export interface Deduction {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  tripId?: string;
  type: DeductionType;
  balanceBefore: number;
  balanceAfter: number;
  status: DeductionStatus;
  date: Date;
  reference?: string;
  performedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeductionInput {
  driverId: string;
  driverName: string;
  driverPhone: string;
  amount: number;
  tripId?: string;
  type: DeductionType;
  balanceBefore: number;
  balanceAfter: number;
  status?: DeductionStatus;
  reference?: string;
  performedBy?: string;
}

export interface DeductionStats {
  totalDeductions: string;
  totalCommission: string;
  manualAdjustments: string;
  totalRefunds: string;
  totalPenalties: string;
  netDeductionAmount: string;
}
