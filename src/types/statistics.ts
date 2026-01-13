export interface StatisticsSummary {
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
    totalSpent: number;
    averageRequestValue: number;
}

export interface MonthlySpendingResponse {
    month: string;
    year: number;
    amount: number;
    requestCount: number;
}

export interface TopMaterialResponse {
    materialId: number;
    materialName: string;
    materialType: string;
    totalQuantity: number;
    totalValue: number;
    requestCount: number;
}

export interface DepartmentSpendingResponse {
    department: string;
    amount: number;
    requestCount: number;
    percentage: number;
}

export interface StatisticsData {
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
    totalSpent: number;
    averageRequestValue: number;
    monthlySpending: Array<{
        month: string;
        amount: number;
        id?: string | number;
    }>;
    topMaterials: Array<{
        name: string;
        quantity: number;
        totalValue: number;
        id?: string | number;
    }>;
    departmentSpending: Array<{
        department: string;
        amount: number;
        percentage: number;
        id?: string | number;
    }>;
}

export interface MonthlyData {
    month: string;
    year: number;
    amount: number;
    requestCount: number;
}

export interface RequestDetail {
    id: number;
    requesterId: number;
    requesterName: string;
    department: string;
    status: string;
    totalPrice: number;
    requestDate: string;
    createdDate: string;
    items: Array<{
        id: number;
        name: string;
        type: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}
