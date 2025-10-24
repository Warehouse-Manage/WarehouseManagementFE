"use client";

import { useState, useEffect } from 'react';
import { X, Smartphone, Settings, Share, Bell } from 'lucide-react';

export default function IOSInstructions() {
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isIOS16_4Plus, setIsIOS16_4Plus] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS and version
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafariBrowser = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isIOSSafariDevice = isIOSDevice && isSafariBrowser;
    
    // Check iOS version
    const getIOSVersion = () => {
      const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
      return 0;
    };
    
    const iosVersion = getIOSVersion();
    const isIOS16_4PlusDevice = isIOSDevice && iosVersion >= 16;
    
    setIsIOS(isIOSDevice);
    setIsIOSSafari(isIOSSafariDevice);
    setIsIOS16_4Plus(isIOS16_4PlusDevice);
    
    // Show instructions for iOS Safari users
    if (isIOSSafariDevice && isIOS16_4PlusDevice) {
      setShowInstructions(true);
    }
  }, []);

  if (!isIOS || !isIOSSafari || !isIOS16_4Plus || !showInstructions) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">iPhone Setup</h2>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Để nhận thông báo trên iPhone:
              </h3>
              <ol className="text-sm text-blue-700 space-y-3">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <div>
                    <strong>Thêm vào Home Screen:</strong>
                    <div className="flex items-center mt-1">
                      <Share className="h-4 w-4 mr-1" />
                      <span>Nhấn nút Share → &quot;Add to Home Screen&quot;</span>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <strong>Bật thông báo:</strong>
                    <div className="flex items-center mt-1">
                      <Settings className="h-4 w-4 mr-1" />
                      <span>Settings → Safari → Websites → Notifications</span>
                    </div>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <div>
                    <strong>Tìm website này và bật &quot;Allow&quot;</strong>
                  </div>
                </li>
                
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <div>
                    <strong>Mở app từ Home Screen</strong>
                  </div>
                </li>
              </ol>
            </div>

            {/* Additional info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-800 mb-2">💡 Lưu ý:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Chỉ hoạt động trên Safari (không phải Chrome)</li>
                <li>• Yêu cầu iOS 16.4 trở lên</li>
                <li>• Phải thêm vào Home Screen để hoạt động tốt nhất</li>
              </ul>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setShowInstructions(false)}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                // Try to trigger the share menu
                if (navigator.share) {
                  navigator.share({
                    title: 'Warehouse Management',
                    url: window.location.href
                  });
                } else {
                  // Fallback - copy URL to clipboard
                  navigator.clipboard.writeText(window.location.href);
                  alert('URL đã được copy vào clipboard. Hãy paste vào Safari và thêm vào Home Screen.');
                }
              }}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Chia sẻ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
