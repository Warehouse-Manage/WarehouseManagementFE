export interface Worker {
    id: number;
    name: string;
    salary: number;
    phoneNumber: string;
    userId?: number | null;
    displayOrder?: number;
    team?: string | null;
    isDeleted?: boolean;
}

export interface WorkerFormData {
    name: string;
    phoneNumber: string;
    salary: number;
    userId?: number | null;
    displayOrder?: number;
    team?: string | null;
}
