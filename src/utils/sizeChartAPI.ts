import { api } from './api';

export interface SizeChartData {
  _id?: string;
  name: string;
  category: string;
  headers: string[];
  rows: Array<{ cells: string[] }>;
  isDefault?: boolean;
}

export const sizeChartAPI = {
  // Get all size charts for current seller
  async getAllSellerCharts(): Promise<SizeChartData[]> {
  const response = await api.get('/api/size-charts');

  console.log("FULL RESPONSE:", response);
  console.log("RESPONSE.DATA:", response.data);

  return response.data;
},

  // Get size chart by ID
  async getChartById(chartId: string): Promise<any> {
    const response = await api.get(`/api/size-charts/${chartId}`);

    console.log("ENTIRE RESPONSE =", response);
    console.log("response =", response);
    console.log("response.data =", response.data);
    console.log("response.data.data =", response.data?.data);

    return response.data?.data ?? response.data;
},

  // Create new size chart
  async createChart(data: SizeChartData): Promise<any> {
  const response = await api.post('/api/size-charts', data);

  console.log("API Response =", response);
  console.log("response.success =", response.success);
  console.log("response.data =", response.data);

  return response.data;
},

  // Update size chart
  async updateChart(chartId: string, data: SizeChartData): Promise<SizeChartData | null> {
    try {
      const response = await api.put(`/api/size-charts/${chartId}`, data);
      return response.data.data || null;
    } catch (error: any) {
      console.error('Error updating size chart:', error);
      throw error;
    }
  },

  // Delete size chart
  async deleteChart(chartId: string): Promise<boolean> {
    try {
      await api.delete(`/api/size-charts/${chartId}`);
      return true;
    } catch (error: any) {
      console.error('Error deleting size chart:', error);
      return false;
    }
  },

  // Get charts by category
  async getChartsByCategory(category: string): Promise<SizeChartData[]> {
    try {
      const response = await api.get(`/api/size-charts/category/${category}`);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching charts by category:', error);
      return [];
    }
  },
};
