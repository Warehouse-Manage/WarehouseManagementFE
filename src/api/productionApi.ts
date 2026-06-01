import { api } from './api';
import { getCookie } from '@/lib/ultis';
import {
    Device,
    DeviceUnit,
    DeviceApiResponse,
    BrickYardStatus,
    BrickYardAggregated,
    DeviceFormData,
    BrickYardStatusFormData,
    DeviceActivity,
    ExtruderDeviceStatus,
    ExtruderTimeRange
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

    getExtruderDeviceStatus: async (): Promise<ExtruderDeviceStatus | null> => {
        try {
            const d = await api.get<Record<string, unknown>>('/api/devices/kiln-status');
            return {
                id: Number(d.id ?? d.Id ?? 0),
                name: (d.name ?? d.Name ?? null) as string | null,
                status: (d.status ?? d.Status ?? d.value ?? d.Value ?? null) as string | null,
                isInactiveWarning: Boolean(d.isInactiveWarning ?? d.IsInactiveWarning ?? false),
                warningMessage: (d.warningMessage ?? d.WarningMessage ?? null) as string | null,
            };
        } catch (err) {
            if (err instanceof Error && (err.message.includes('404') || err.message.includes('Không tìm thấy'))) {
                return null;
            }
            throw err;
        }
    },

    createDevice: async (data: DeviceFormData): Promise<Device> => {
        const companyIdRaw = getCookie('companyId');
        const companyIdFromCookie =
            companyIdRaw && companyIdRaw !== '0' ? Number(companyIdRaw) : 0;
        const companyId = data.companyId ?? companyIdFromCookie;
        return api.post<Device>('/api/devices', { ...data, companyId });
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
    },

    // Device Activities
    getDeviceActivities: async (date: string): Promise<DeviceActivity> => {
        return api.get<DeviceActivity>(`/api/deviceactivity?date=${date}`);
    },

    // Extruder Time Ranges
    getExtruderTimeRanges: async (): Promise<ExtruderTimeRange[]> => {
        return api.get<ExtruderTimeRange[]>('/api/extrudertimeranges');
    },

    createExtruderTimeRange: async (data: { startTime: string; endTime: string }): Promise<ExtruderTimeRange> => {
        return api.post<ExtruderTimeRange>('/api/extrudertimeranges', data);
    },

    deleteExtruderTimeRange: async (id: number): Promise<void> => {
        return api.delete(`/api/extrudertimeranges/${id}`);
    }
};
