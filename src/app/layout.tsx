import type { Metadata } from "next";
import NavbarContainer from "./components/NavbarContainer";
import IOSInstructions from "./components/IOSInstructions";
import PermissionPrompt from "./components/PermissionPrompt";
import { Inter, Noto_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ứng dụng quản lý kho",
  description: "Ứng dụng quản lý kho nội bộ công ty",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quản lý kho",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ea4c00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="apple-touch-icon" href="/icon512_rounded.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Quản lý kho" />
      </head>
      <body
        className={`${inter.variable} ${notoSans.variable} font-sans antialiased`}
      >
        <NavbarContainer />
        <main className="mx-auto max-w-6xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
          {children}
        </main>
        <IOSInstructions />
        <PermissionPrompt />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              let deferredPrompt;
              let installButton;
              
              // iOS detection with version support
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
              const isIOSChrome = /CriOS/.test(navigator.userAgent);
              const isIOSSafari = isIOS && isSafari;
              
              // Check iOS version for 16.4+ support
              const getIOSVersion = () => {
                const match = navigator.userAgent.match(/OS (\\d+)_(\\d+)/);
                if (match) {
                  return parseInt(match[1], 10);
                }
                return 0;
              };
              
              const iosVersion = getIOSVersion();
              const isIOS16_4Plus = isIOS && iosVersion >= 16;
              
              // Register service worker with iOS 16.4+ Safari support
              if ('serviceWorker' in navigator) {
                if (isIOS && !isIOSSafari) {
                  console.log('Service Worker registration skipped on iOS Chrome - use Safari for better compatibility');
                } else if (isIOS && isIOSSafari && !isIOS16_4Plus) {
                  console.log('Service Worker registration skipped on iOS < 16.4 - update to iOS 16.4+ for push notifications');
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                        if (isIOSSafari && isIOS16_4Plus) {
                          console.log('iOS 16.4+ Safari detected - push notifications may work');
                        }
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              }
              
              // Global error handler for iOS compatibility
              window.addEventListener('error', function(event) {
                console.error('Global error caught:', event.error);
                // Don't show error alerts on iOS to avoid blocking the UI
                if (!isIOS) {
                  console.error('Application error:', event.error);
                }
              });
              
              // Handle unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                console.error('Unhandled promise rejection:', event.reason);
                // Prevent the default behavior (which would log to console)
                event.preventDefault();
              });
              
              // Handle install prompt (skip on iOS)
              if (!isIOS) {
                window.addEventListener('beforeinstallprompt', function(e) {
                  console.log('beforeinstallprompt event fired');
                  e.preventDefault();
                  deferredPrompt = e;
                  
                  // Show install button
                  showInstallButton();
                });
              }
              
              function showInstallButton() {
                if (!installButton) {
                  installButton = document.createElement('button');
                  installButton.textContent = '📱 Cài đặt ứng dụng';
                  installButton.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 1000;
                    background: #ea4c00;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  \`;
                  
                  installButton.addEventListener('click', function() {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      deferredPrompt.userChoice.then(function(choiceResult) {
                        if (choiceResult.outcome === 'accepted') {
                          console.log('User accepted the install prompt');
                        } else {
                          console.log('User dismissed the install prompt');
                        }
                        deferredPrompt = null;
                        installButton.style.display = 'none';
                      });
                    }
                  });
                  
                  document.body.appendChild(installButton);
                }
                installButton.style.display = 'block';
              }
              
              // Hide install button after installation
              window.addEventListener('appinstalled', function() {
                console.log('PWA was installed');
                if (installButton) {
                  installButton.style.display = 'none';
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
