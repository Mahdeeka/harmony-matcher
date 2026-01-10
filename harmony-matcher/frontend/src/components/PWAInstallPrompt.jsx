import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { showInfo } = useToast();

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      showInfo('تم تثبيت التطبيق بنجاح! 🎉');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showInfo]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Reset the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);

    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
    } else {
      console.log('User dismissed PWA install');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already dismissed recently (within 7 days)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime && Date.now() - parseInt(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in-up">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-harmony-100 dark:bg-harmony-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-harmony-600 dark:text-harmony-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              قم بتثبيت التطبيق
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              احصل على تجربة أفضل مع إشعارات فورية ووضع عدم الاتصال
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm"
              >
                <Download className="w-4 h-4" />
                تثبيت
              </button>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2"
                title="تجاهل"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
