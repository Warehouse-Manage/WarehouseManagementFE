export interface Worker {
    id: number;
    name: string;
    salary: number;
    phoneNumber: string;
    age: number;
    userId?: number | null;
}

export interface WorkerFormData {
    name: string;
    age: number;
    phoneNumber: string;
    salary: number;
    userId?: number | null;
}
