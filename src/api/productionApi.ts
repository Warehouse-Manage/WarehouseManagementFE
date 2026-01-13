import { api } from './api';
import {
    Device,
    DeviceUnit,
    DeviceApiResponse,
    BrickYardStatus,
    BrickYardAggregated,
    DeviceFormData,
    BrickYardStatusFormData
} from '@/types';

export const productionApi = {
    // Devices
    getDevices: async (): Promise<Device[]> => {
        const data = await api.get<DeviceApiResponse[]>('/api/devices');
        return data.map((d) => ({
            ...d,
            isAuto: d.isAuto === 'true' || d.isAuto === true || d.isAuto === 'True',
        }));
    },

    createDevice: async (data: DeviceFormData): Promise<Device> => {
        return api.post<Device>('/api/devices', data);
    },

    updateDevice: async (id: number, data: DeviceFormData | Partial<Device>): Promise<Device> => {
        return api.put<Device>(`/api/devices/${id}`, data);
    },

    deleteDevice: async (id: number): Promise<void> => {
        return api.delete(`/api/devices/${id}`);
    },

    updateDeviceValue: async (id: number, value: string): Promise<void> => {
        return api.patch(`/api/devices/${id}/value`, { value });
    },

    // Device Units
    getDeviceUnits: async (): Promise<DeviceUnit[]> => {
        return api.get<DeviceUnit[]>('/api/deviceunits');
    },

    // Brick Yard Status
    getBrickYardStatuses: async (params?: Record<string, string>): Promise<BrickYardStatus[] | BrickYardAggregated[]> => {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        return api.get<BrickYardStatus[] | BrickYardAggregated[]>(`/api/brickyardstatus${query}`);
    },

    createBrickYardStatus: async (data: BrickYardStatusFormData): Promise<BrickYardStatus> => {
        return api.post<BrickYardStatus>('/api/brickyardstatus', data);
    }
};
