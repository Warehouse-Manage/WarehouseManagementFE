import { api } from './api';
import { Attendance, MarkAttendancePayload, PaySalaryPayload, SaveAttendancePayload, WorkDate } from '../types';

export const attendanceApi = {
    getWorkerAttendance: async (workerId: number, year: string, month: number): Promise<Attendance> => {
        return api.get<Attendance>(`/api/attendances/worker/${workerId}/month/${year}/${month}`);
    },

    markAttendance: async (data: MarkAttendancePayload): Promise<Attendance> => {
        return api.post<Attendance>('/api/attendances/mark', data);
    },

    paySalary: async (attendanceId: number, data: PaySalaryPayload): Promise<Attendance> => {
        return api.post<Attendance>(`/api/attendances/${attendanceId}/pay-salary`, data);
    },

    getOverview: async (year: string, month: number): Promise<Record<string, Attendance>> => {
        return api.get<Record<string, Attendance>>(`/api/attendances/overview/month/${year}/${month}`);
    },

    getAttendances: async (year: string, month: number): Promise<Attendance[]> => {
        return api.get<Attendance[]>(`/api/attendances?year=${year}&month=${month}`);
    },

    getWorkerWorkDates: async (workerId: number, startDate: string, endDate: string): Promise<WorkDate[]> => {
        return api.get<WorkDate[]>(`/api/attendances/worker/${workerId}/workdates?startDate=${startDate}&endDate=${endDate}`);
    },

    saveAttendance: async (data: SaveAttendancePayload): Promise<Attendance> => {
        return api.post<Attendance>('/api/attendances', data);
    }
};
