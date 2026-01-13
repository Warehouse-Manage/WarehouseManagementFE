export interface DeviceUnit {
    id: number;
    type: string | null;
    unit: string | null;
}

export interface Device {
    [key: string]: unknown; // Index signature for DataTable
    id: number;
    name: string | null;
    description: string | null;
    deviceUnitId: number;
    lowLimit: number;
    highLimit: number;
    value: string | null;
    start: string | null;
    end: string | null;
    isAuto: boolean | null;
    deviceUnit?: DeviceUnit;
}

export interface DeviceApiResponse {
    id: number;
    name: string | null;
    description: string | null;
    deviceUnitId: number;
    lowLimit: number;
    highLimit: number;
    value: string | null;
    start: string | null;
    end: string | null;
    isAuto: string | null | boolean;
    deviceUnit?: DeviceUnit;
}

export interface BrickYardStatus {
    id: number;
    packageQuantity: number;
    dateTime: string;
}

export interface BrickYardAggregated {
    totalPackageQuantity: number;
    periodStart: string;
    periodEnd: string;
    periodType: string;
    recordCount: number;
}

export interface DeviceFormData {
    [key: string]: unknown;
    name: string;
    description: string;
    deviceUnitId: number;
    lowLimit: number;
    highLimit: number;
    value: string;
    start: string | null;
    end: string | null;
    isAuto: boolean;
}

export interface BrickYardStatusFormData {
    packageQuantity: number;
    dateTime: string;
}
