'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { toast } from 'sonner';
import { productionApi } from '@/api';
import { Device, DeviceUnit, DeviceFormData } from '@/types';
import { DataTable } from '@/components/shared';
import AddDeviceModal from './modal/AddDeviceModal';
import EditDeviceModal from './modal/EditDeviceModal';

export default function ThietBiPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceUnits, setDeviceUnits] = useState<DeviceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState<DeviceFormData>({
    name: '',
    description: '',
    deviceUnitId: 0,
    lowLimit: 0,
    highLimit: 0,
    value: '',
    starts: '',
    ends: '',
    isAuto: false
  });


  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const role = getCookie('role');
    const userId = getCookie('userId');
    const userName = getCookie('userName');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    if (role !== 'Admin' && role !== 'accountance') {
      setCanFetch(false);
      setIsCheckingAuth(false);
      return;
    }
    setCanFetch(true);
    setIsCheckingAuth(false);
  }, [router]);

  const fetchDeviceUnits = useCallback(async () => {
    try {
      const data = await productionApi.getDeviceUnits();
      setDeviceUnits(data);
    } catch (err) {
      console.error('Lỗi khi tải đơn vị thiết bị:', err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productionApi.getDevices();
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canFetch) return;
    fetchDeviceUnits();
    fetchDevices();
  }, [fetchDeviceUnits, fetchDevices, canFetch]);

  const handleAddDevice = async () => {
    try {
      if (!newDevice.name || newDevice.deviceUnitId === 0) {
        toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      await productionApi.createDevice({
        name: newDevice.name,
        description: newDevice.description,
        deviceUnitId: Number(newDevice.deviceUnitId),
        lowLimit: Number(newDevice.lowLimit),
        highLimit: Number(newDevice.highLimit),
        value: newDevice.value,
        starts: newDevice.starts || null,
        ends: newDevice.ends || null,
        isAuto: !!newDevice.isAuto
      });

      setShowAddForm(false);
      setNewDevice({
        name: '',
        description: '',
        deviceUnitId: 0,
        lowLimit: 0,
        highLimit: 0,
        value: '',
        starts: '',
        ends: '',
        isAuto: false
      });
      fetchDevices();
      toast.success('Thêm thiết bị thành công');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleEditDevice = async () => {
    if (!editingDevice) return;

    try {
      await productionApi.updateDevice(editingDevice.id, {
        id: editingDevice.id,
        name: editingDevice.name,
        description: editingDevice.description,
        deviceUnitId: Number(editingDevice.deviceUnitId),
        lowLimit: Number(editingDevice.lowLimit),
        highLimit: Number(editingDevice.highLimit),
        value: editingDevice.value,
        starts: editingDevice.starts || null,
        ends: editingDevice.ends || null,
        isAuto: !!editingDevice.isAuto
      });

      setShowEditForm(false);
      setEditingDevice(null);
      fetchDevices();
      toast.success('Cập nhật thiết bị thành công');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      return;
    }

    try {
      await productionApi.deleteDevice(id);
      fetchDevices();
      toast.success('Xóa thiết bị thành công');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const openEditForm = (device: Device) => {
    setEditingDevice({ ...device });
    setShowEditForm(true);
  };

  const saveDeviceValue = async (device: Device, newValue: string) => {
    try {
      await productionApi.updateDeviceValue(device.id, newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      fetchDevices();
    }
  };

  const updateLocalDeviceValue = (deviceId: number, newValue: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, value: newValue } : d));
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Đang kiểm tra xác thực...</span>
        </div>
      </div>
    );
  }

  const role = getCookie('role');
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quản lý thiết bị IoT</h1>
          <p className="text-sm text-gray-600 mt-1">Cấu hình và kiểm soát các thiết bị trong hệ thống sản xuất</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-5 h-5 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm thiết bị
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Danh sách thiết bị</h2>
          <button onClick={fetchDevices} className="text-xs font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider cursor-pointer transition-colors">Làm mới</button>
        </div>

        <div className="p-4">
          <DataTable
            data={devices}
            isLoading={loading}
            columns={[
              {
                key: 'stt',
                header: 'STT',
                className: 'w-12 text-gray-400 font-mono text-center',
                render: (_, index) => <span>{index + 1}</span>
              },
              {
                key: 'name',
                header: 'Thiết bị',
                className: 'min-w-[200px]',
                render: (d) => (
                  <div className="py-1">
                    <div className="font-black text-gray-900">{d.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[250px] italic">{d.description || 'Không có mô tả'}</div>
                  </div>
                )
              },
              {
                key: 'type',
                header: 'Loại',
                className: 'text-gray-600 font-medium',
                render: (d) => <span className="px-2.5 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-500">{d.deviceUnit?.type || 'N/A'}</span>
              },
              {
                key: 'value',
                header: 'Trạng thái / Điều khiển',
                className: 'min-w-[280px]',
                render: (d) => {
                  const type = d.deviceUnit?.type?.toLowerCase();
                  if (type === 'bool' || type === 'boolean') {
                    const isOn = (d.value || '').toLowerCase() === 'true';
                    return (
                      <button
                        onClick={() => {
                          const nextVal = (!isOn).toString();
                          updateLocalDeviceValue(d.id, nextVal);
                          saveDeviceValue(d, nextVal);
                        }}
                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all shadow-sm border-2 cursor-pointer ${isOn ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                      >
                        <span className={`w-2 h-2 rounded-full mr-2 ${isOn ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                        {isOn ? 'Đang hoạt động' : 'Tạm dừng'}
                      </button>
                    );
                  }

                  if (['double', 'int', 'integer', 'number', 'float'].includes(type || '')) {
                    const min = Number.isFinite(d.lowLimit) && d.lowLimit !== null ? d.lowLimit : 0;
                    const max = Number.isFinite(d.highLimit) && d.highLimit !== null && d.highLimit > min ? d.highLimit : 100;
                    const numeric = (() => {
                      const n = Number(d.value);
                      return Number.isFinite(n) ? n : min;
                    })();
                    return (
                      <div className="flex items-center gap-4 bg-orange-50/50 px-3 py-2 rounded-xl border border-orange-100/50 shadow-inner max-w-xs">
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={['double', 'float'].includes(type || '') ? 0.1 : 1}
                          value={numeric}
                          onChange={(e) => updateLocalDeviceValue(d.id, e.target.value)}
                          onMouseUp={(e) => saveDeviceValue(d, (e.target as HTMLInputElement).value)}
                          onTouchEnd={(e) => saveDeviceValue(d, (e.target as HTMLInputElement).value)}
                          className="w-full accent-orange-600 h-1.5"
                        />
                        <span className="tabular-nums font-black text-orange-700 min-w-[50px] text-right text-sm">{numeric} {d.deviceUnit?.unit}</span>
                      </div>
                    );
                  }

                  return <span className="font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border text-sm">{d.value || '-'}</span>;
                }
              },
              {
                key: 'actions',
                header: 'Thao tác',
                headerClassName: 'text-center',
                className: 'text-center',
                render: (d) => (
                  <div className="flex gap-2">
                    <button onClick={() => openEditForm(d)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => handleDeleteDevice(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                )
              }
            ]}
            emptyMessage="Hệ thống chưa ghi nhận thiết bị IoT nào"
          />
        </div>
      </div>

      <AddDeviceModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        deviceUnits={deviceUnits}
        newDevice={newDevice}
        error={error}
        onDeviceChange={(field, value) => setNewDevice((prev) => ({ ...prev, [field]: value } as DeviceFormData))}
        onAdd={handleAddDevice}
      />

      <EditDeviceModal
        isOpen={showEditForm && !!editingDevice}
        onClose={() => { setShowEditForm(false); setEditingDevice(null); }}
        editingDevice={editingDevice}
        deviceUnits={deviceUnits}
        onDeviceChange={(field, value) => setEditingDevice((prev) => prev ? ({ ...prev, [field]: value } as Device) : null)}
        onSave={handleEditDevice}
      />
    </div>
  );
}
