// src/modules/deductions/deduction.service.ts
import { DeductionRepository } from './deduction.repository';
import { CreateDeductionInput, Deduction, DeductionStats } from './deduction.model';

export const DeductionService = {
  async createDeduction(data: CreateDeductionInput): Promise<Deduction> {
    return DeductionRepository.create(data);
  },

  async getAllDeductions(filters: { search?: string; status?: string; type?: string }): Promise<{ deductions: any[], stats: DeductionStats }> {
    const deductions = await DeductionRepository.findAll(filters);
    const stats = await DeductionRepository.getStats();

    // Reformat for UI expectation if necessary
    const formattedDeductions = deductions.map(d => ({
      id: d?.id,
      driver: {
        id: d?.driverId,
        fullName: d?.driverName,
        phone: d?.driverPhone
      },
      amount: `\$${(d?.amount || 0).toFixed(2)}`,
      trip: d?.tripId || 'N/A',
      type: d?.type,
      balanceBefore: `\$${(d?.balanceBefore || 0).toFixed(2)}`,
      balanceAfter: `\$${(d?.balanceAfter || 0).toFixed(2)}`,
      status: d?.status,
      date: d?.date?.toISOString?.() || new Date().toISOString(),
      reference: d?.reference || 'N/A',
      performedBy: d?.performedBy
    }));

    return {
      deductions: formattedDeductions,
      stats
    };
  },

  async getDeductionById(id: string): Promise<any | null> {
    const d = await DeductionRepository.findById(id);
    if (!d) return null;

    return {
      id: d?.id,
      driver: {
        id: d?.driverId,
        fullName: d?.driverName,
        phone: d?.driverPhone
      },
      amount: `\$${(d?.amount || 0).toFixed(2)}`,
      trip: d?.tripId || 'N/A',
      type: d?.type,
      balanceBefore: `\$${(d?.balanceBefore || 0).toFixed(2)}`,
      balanceAfter: `\$${(d?.balanceAfter || 0).toFixed(2)}`,
      status: d?.status,
      date: d?.date?.toISOString?.() || new Date().toISOString(),
      reference: d?.reference || 'N/A',
      performedBy: d?.performedBy
    };
  }
};
