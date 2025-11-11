'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';

interface Device {
  id: number;
  name: string | null;
  description: string | null;
  deviceUnitId: number;
  lowLimit: number;
  highLimit: number;
  value: string | null;
  deviceUnit?: DeviceUnit;
}

interface DeviceUnit {
  id: number;
  type: string | null;
}

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceUnits, setDeviceUnits] = useState<DeviceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState({
    name: '',
    description: '',
    deviceUnitId: 0,
    lowLimit: 0,
    highLimit: 0,
    value: ''
  });
  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const role = getCookie('role');
    const userId = getCookie('userId');
    const userName = getCookie('userName');
    
    // Redirect to login if userId or userName is missing
    if (!userId || !userName) {
      router.push('/login');
      return;
    }
    
    // Redirect users with 'user' or 'approver' role away from this page
    if (role === 'user' || role === 'approver') {
      window.location.replace('/');
      setLoading(false);
      return;
    }
    setCanFetch(true);
    setIsCheckingAuth(false);
  }, [router]);

  const fetchDeviceUnits = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/deviceunits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách đơn vị thiết bị');
      }

      const data = await response.json();
      setDeviceUnits(data);
    } catch (err) {
      console.error('Lỗi khi tải đơn vị thiết bị:', err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu thiết bị');
      }

      const data = await response.json();
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
        alert('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDevice.name,
          description: newDevice.description,
          deviceUnitId: newDevice.deviceUnitId,
          lowLimit: newDevice.lowLimit,
          highLimit: newDevice.highLimit,
          value: newDevice.value
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Không thể thêm thiết bị');
      }

      setShowAddForm(false);
      setNewDevice({
        name: '',
        description: '',
        deviceUnitId: 0,
        lowLimit: 0,
        highLimit: 0,
        value: ''
      });
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleEditDevice = async () => {
    if (!editingDevice) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/devices/${editingDevice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingDevice.id,
          name: editingDevice.name,
          description: editingDevice.description,
          deviceUnitId: editingDevice.deviceUnitId,
          lowLimit: editingDevice.lowLimit,
          highLimit: editingDevice.highLimit,
          value: editingDevice.value
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Không thể cập nhật thiết bị');
      }

      setShowEditForm(false);
      setEditingDevice(null);
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/devices/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Không thể xóa thiết bị');
      }

      fetchDevices();
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/devices/${device.id}/value`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: newValue
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Không thể cập nhật giá trị thiết bị');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      // revert UI by refetching
      fetchDevices();
    }
  };

  const updateLocalDeviceValue = (deviceId: number, newValue: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, value: newValue } : d));
  };

  // Show loading screen while checking authentication
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý thiết bị IoT</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Thêm và quản lý các thiết bị IoT</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Thêm thiết bị</span>
          <span className="sm:hidden">Thêm</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Devices Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Danh sách thiết bị</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchDevices}
              className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600">Chưa có thiết bị nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên thiết bị
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá trị hiện tại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device, index) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {device.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {device.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const type = device.deviceUnit?.type?.toLowerCase();
                        if (type === 'bool' || type === 'boolean') {
                          const isOn = (device.value || '').toLowerCase() === 'true';
                          return (
                            <button
                              onClick={() => {
                                const nextVal = (!isOn).toString();
                                updateLocalDeviceValue(device.id, nextVal);
                                saveDeviceValue(device, nextVal);
                              }}
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                isOn ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'
                              }`}
                            >
                              {isOn ? 'Bật' : 'Tắt'}
                            </button>
                          );
                        }

                        if (type === 'double' || type === 'int' || type === 'integer' || type === 'number') {
                          const min = Number.isFinite(device.lowLimit) && device.lowLimit !== null ? device.lowLimit : 0;
                          const max = Number.isFinite(device.highLimit) && device.highLimit !== null && device.highLimit > min ? device.highLimit : 100;
                          const numeric = (() => {
                            const n = Number(device.value);
                            if (Number.isFinite(n)) return n;
                            // fallback when value is empty or invalid
                            return min;
                          })();
                          return (
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={type === 'double' ? 0.1 : 1}
                                value={numeric}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateLocalDeviceValue(device.id, v);
                                }}
                                onMouseUp={(e) => {
                                  const v = (e.target as HTMLInputElement).value;
                                  saveDeviceValue(device, v);
                                }}
                                onTouchEnd={(e) => {
                                  const target = e.target as HTMLInputElement;
                                  const v = target.value;
                                  saveDeviceValue(device, v);
                                }}
                                className="w-40 accent-orange-600"
                              />
                              <span className="tabular-nums w-12 text-right">{numeric}</span>
                            </div>
                          );
                        }

                        return device.value || '-';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditForm(device)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Thêm thiết bị mới</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên thiết bị *</label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={newDevice.description}
                  onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị *</label>
                <select
                  value={newDevice.deviceUnitId}
                  onChange={(e) => setNewDevice({ ...newDevice, deviceUnitId: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="0">Chọn đơn vị</option>
                  {deviceUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.type || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới hạn dưới</label>
                  <input
                    type="number"
                    value={newDevice.lowLimit}
                    onChange={(e) => setNewDevice({ ...newDevice, lowLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới hạn trên</label>
                  <input
                    type="number"
                    value={newDevice.highLimit}
                    onChange={(e) => setNewDevice({ ...newDevice, highLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Giá trị hiện tại</label>
                <input
                  type="text"
                  value={newDevice.value}
                  onChange={(e) => setNewDevice({ ...newDevice, value: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewDevice({
                    name: '',
                    description: '',
                    deviceUnitId: 0,
                    lowLimit: 0,
                    highLimit: 0,
                    value: ''
                  });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddDevice}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditForm && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Chỉnh sửa thiết bị</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên thiết bị *</label>
                <input
                  type="text"
                  value={editingDevice.name || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={editingDevice.description || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị *</label>
                <select
                  value={editingDevice.deviceUnitId}
                  onChange={(e) => setEditingDevice({ ...editingDevice, deviceUnitId: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="0">Chọn đơn vị</option>
                  {deviceUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.type || '-'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới hạn dưới</label>
                  <input
                    type="number"
                    value={editingDevice.lowLimit}
                    onChange={(e) => setEditingDevice({ ...editingDevice, lowLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới hạn trên</label>
                  <input
                    type="number"
                    value={editingDevice.highLimit}
                    onChange={(e) => setEditingDevice({ ...editingDevice, highLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Giá trị hiện tại</label>
                <input
                  type="text"
                  value={editingDevice.value || ''}
                  onChange={(e) => setEditingDevice({ ...editingDevice, value: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingDevice(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleEditDevice}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

