import { Worker } from "./worker";

export interface WorkDate {
    id?: number;
    workDate: string;
    workQuantity: number;
    workOvertime: number;
}

export interface Attendance {
    id: number;
    workerId: number;
    daysOff: WorkDate[];
    monthlySalary: number;
    salaryPaid: number;
    calculationMonth: string;
    worker?: Worker;
}

export interface MarkAttendancePayload {
    workerId: number;
    workDate: string;
    workQuantity: number;
    workOvertime: number;
}

export interface PaySalaryPayload {
    amount: number;
    createdUserId: number;
}

export interface SaveAttendancePayload {
    workerId: number;
    calculationMonth: string;
    workDates: Array<{
        workDate: string;
        workQuantity: number;
        workOvertime: number;
    }>;
}
