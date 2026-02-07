'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/api/authApi';

const PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: ''
  });
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
    return usernameRegex.test(username);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username) {
      newErrors.username = 'Vui lòng nhập tên người dùng';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự và chỉ chứa chữ cái, số, dấu gạch dưới';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const data = await authApi.login({
        userName: formData.username,
        password: formData.password,
      });

      if (data.success) {
        document.cookie = `role=${data.user.role}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
        document.cookie = `userName=${encodeURIComponent(data.user.userName || '')}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
        document.cookie = `name=${encodeURIComponent(data.user.name || '')}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
        document.cookie = `userId=${data.user.id}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
        if (data.user.department) {
          document.cookie = `department=${encodeURIComponent(data.user.department)}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
        }
        document.cookie = `token=${data.token}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;

        localStorage.setItem('token', data.token);

        console.log('Đăng nhập thành công:', data);
        toast.success('Đăng nhập thành công!');
        window.location.href = '/';
      } else {
        toast.error(data.message || 'Đăng nhập thất bại');
      }
    } catch (error: unknown) {
      console.error('Lỗi kết nối:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi kết nối đến server';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordData.username) {
      toast.warning('Vui lòng nhập tên người dùng');
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      const data = await authApi.forgotPassword(forgotPasswordData.username);
      if (data.success) {
        toast.info(data.message);
        if (data.resetToken) {
          setForgotPasswordData(prev => ({ ...prev, resetToken: data.resetToken || '' }));
          toast.success(`Reset Token (Development): ${data.resetToken}`);
        }
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error: unknown) {
      console.error('Lỗi:', error);
      toast.error('Lỗi kết nối đến server');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword) {
      toast.warning('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu');
      return;
    }
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      toast.warning('Mật khẩu xác nhận không khớp');
      return;
    }
    if (forgotPasswordData.newPassword.length < 6) {
      toast.warning('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      const data = await authApi.resetPassword({
        userName: forgotPasswordData.username,
        token: forgotPasswordData.resetToken,
        newPassword: forgotPasswordData.newPassword
      });

      if (data.success) {
        toast.success(data.message);
        setShowForgotPassword(false);
        setForgotPasswordData({
          username: '',
          newPassword: '',
          confirmPassword: '',
          resetToken: ''
        });
      } else {
        toast.error(data.message || 'Có lỗi xảy ra');
      }
    } catch (error: unknown) {
      console.error('Lỗi:', error);
      toast.error('Lỗi kết nối đến server');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-2 sm:px-4 py-4 sm:py-8">
      <div className="w-full max-w-md">
        {/* 登录卡片 */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-8 border border-gray-200">
          {/* 头部 */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 tracking-tight">Chào mừng trở lại</h1>
            <p className="text-gray-600 text-sm">Vui lòng đăng nhập vào tài khoản của bạn</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tên người dùng */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Tên người dùng
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`h-5 w-5 transition-colors duration-200 ${errors.username ? 'text-red-400' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-black placeholder-gray-400 ${errors.username
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 bg-white'
                    }`}
                  placeholder="Nhập tên người dùng của bạn"
                />
              </div>
              {errors.username && (
                <div className="flex items-center space-x-2 mt-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600 font-medium">{errors.username}</p>
                </div>
              )}
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={`h-5 w-5 transition-colors duration-200 ${errors.password ? 'text-red-400' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-black placeholder-gray-400 ${errors.password
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 bg-white'
                    }`}
                  placeholder="Nhập mật khẩu của bạn"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-orange-500 transition-colors duration-200 focus:outline-none focus:text-orange-500 cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center space-x-2 mt-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-600 font-medium">{errors.password}</p>
                </div>
              )}
            </div>

            {/* 记住我和忘记密码 */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-3">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-colors duration-200"
                />
                <label htmlFor="remember-me" className="text-sm text-gray-700 cursor-pointer select-none">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-orange-600 hover:text-orange-500 transition-colors duration-200 hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>


          {/* 注册链接 */}
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <a href="#" className="font-semibold text-orange-600 hover:text-orange-500 transition-colors duration-200 hover:underline">
                Đăng ký ngay
              </a>
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © 2024 Tên công ty. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>

      {/* Modal Quên mật khẩu */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowForgotPassword(false)}></div>
            <div className="relative w-full max-w-md mx-4 rounded-xl bg-white p-4 sm:p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Quên mật khẩu</h2>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Bước 1: Nhập username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên người dùng
                  </label>
                  <input
                    type="text"
                    value={forgotPasswordData.username}
                    onChange={(e) => setForgotPasswordData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    placeholder="Nhập tên người dùng"
                  />
                </div>

                {/* Bước 2: Nhập mật khẩu mới (chỉ hiển thị khi có reset token) */}
                {forgotPasswordData.resetToken && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={forgotPasswordData.newPassword}
                        onChange={(e) => setForgotPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Xác nhận mật khẩu
                      </label>
                      <input
                        type="password"
                        value={forgotPasswordData.confirmPassword}
                        onChange={(e) => setForgotPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  disabled={isForgotPasswordLoading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                {!forgotPasswordData.resetToken ? (
                  <button
                    onClick={handleForgotPassword}
                    disabled={isForgotPasswordLoading}
                    className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isForgotPasswordLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang gửi...
                      </>
                    ) : (
                      'Gửi yêu cầu'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleResetPassword}
                    disabled={isForgotPasswordLoading}
                    className="inline-flex items-center rounded-lg bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-green-600 hover:via-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isForgotPasswordLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang đặt lại...
                      </>
                    ) : (
                      'Đặt lại mật khẩu'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
