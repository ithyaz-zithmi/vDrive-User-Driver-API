import { RechargePlanRepository } from './rechargePlan.repository';

export const RechargePlanService = {
  
 
  async getPlans(page: number = 1, limit: number = 10) {
    return await RechargePlanRepository.getPlans(page, limit);
  },

 
  async getPlanById(id: number) {
    return await RechargePlanRepository.getById(id);
  },


  async createPlan(data: any) {
    return await RechargePlanRepository.create(data);
  },


  async updatePlan(id: number, data: any) {
    return await RechargePlanRepository.update(id, data);
  },

  
  async toggleStatus(id: number, status: boolean) {
    return await RechargePlanRepository.toggle(id, status);
  },


  async deletePlan(id: number) {
    return await RechargePlanRepository.delete(id);
  },
};
