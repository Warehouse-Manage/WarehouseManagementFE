export interface BrokenPackageItem {
    type: string;
    quantity: number;
}

export interface TeamPayment {
    id: number;
    previousDayRemaining: number; // A - tự động tính
    todayRemaining: number; // B - người dùng nhập
    newPackagesFromA: number; // C - tự động tính
    brokenPackages: BrokenPackageItem[];
    pricePerPackage: number;
    teamLeaderName: string;
    pricePerBrokenPackage: number;
    totalAmountPackage: number; // Tiền gòng
    totalAmountBroken: number; // Tiền kiện sổ
    totalAmount: number; // Tổng
    fundIdPackage?: number;
    fundIdBroken?: number;
    dateCreated: string;
    createdUserId: number;
}

export interface TeamPaymentFormData {
    todayRemaining: number;
    brokenPackages: BrokenPackageItem[];
    createdUserId: number;
}

export interface TeamPaymentSettings {
    id: number;
    pricePerPackage: number;
    teamLeaderName: string;
    pricePerBrokenPackage: number;
}

export interface TeamPaymentSettingsFormData {
    pricePerPackage: number;
    teamLeaderName: string;
    pricePerBrokenPackage: number;
}
