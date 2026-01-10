import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Eye } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const FileUpload = ({ onFileUpload, accept = ".xlsx,.xls,.csv", multiple = false }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));

    if (!isValidType) {
      showError(`نوع الملف غير مدعوم. يرجى استخدام: ${accept}`);
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showError('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت');
      return false;
    }

    return true;
  };

  const processFile = async (file) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // Call the upload handler
      await onFileUpload(file, formData);

      setUploadProgress(100);
      clearInterval(progressInterval);

      showSuccess(`تم رفع الملف ${file.name} بنجاح`);

      // Reset after successful upload
      setTimeout(() => {
        resetUpload();
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      showError(error.response?.data?.error || 'فشل في رفع الملف');
      resetUpload();
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setPreviewData(null);
    setShowPreview(false);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const generatePreview = async (file) => {
    try {
      setPreviewData({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type || 'Unknown',
        lastModified: new Date(file.lastModified).toLocaleDateString('ar-EG'),
        headers: ['الاسم', 'الهاتف', 'المسمى الوظيفي', 'الشركة'], // Sample headers
        rows: [
          ['أحمد محمد', '0501234567', 'مطور برمجيات', 'شركة تكنولوجيا'],
          ['فاطمة علي', '0529876543', 'مصممة', 'استوديو التصميم'],
          ['محمد حسن', '0545678901', 'مدير مشاريع', 'شركة استشارات']
        ]
      });
      setShowPreview(true);
    } catch (error) {
      showError('فشل في إنشاء معاينة الملف');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragOver
            ? 'border-harmony-500 bg-harmony-50 scale-105'
            : 'border-gray-300 hover:border-harmony-400 hover:bg-gray-50'
          }
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto">
              <div className="spinner"></div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-medium text-gray-900">
                جاري رفع الملف...
              </div>
              <div className="text-sm text-gray-500">
                {selectedFile?.name}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-harmony-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500">
                {uploadProgress}%
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-colors
              ${isDragOver ? 'bg-harmony-100' : 'bg-gray-100'}`}
            >
              <Upload className={`w-8 h-8 transition-colors
                ${isDragOver ? 'text-harmony-600' : 'text-gray-400'}`}
              />
            </div>

            <div>
              <div className="text-lg font-medium text-gray-900 mb-2">
                رفع ملف Excel أو CSV
              </div>
              <div className="text-sm text-gray-500 mb-4">
                اسحب الملف وأفلته هنا، أو انقر للاختيار
              </div>
              <div className="text-xs text-gray-400">
                يدعم: {accept} • الحد الأقصى: 10 ميجابايت
              </div>
            </div>

            {selectedFile && !uploading && (
              <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">{selectedFile.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePreview(selectedFile);
                  }}
                  className="text-harmony-600 hover:text-harmony-700 p-1"
                  title="معاينة"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetUpload();
                  }}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="إزالة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {showPreview && previewData && (
        <div className="modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">معاينة الملف</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* File Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">اسم الملف</div>
                <div className="font-medium text-gray-900 truncate">{previewData.name}</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">الحجم</div>
                <div className="font-medium text-gray-900">{previewData.size}</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">النوع</div>
                <div className="font-medium text-gray-900">{previewData.type}</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">آخر تعديل</div>
                <div className="font-medium text-gray-900">{previewData.lastModified}</div>
              </div>
            </div>

            {/* Data Preview */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">معاينة البيانات (أول 3 صفوف)</h4>
                <p className="text-sm text-gray-500 mt-1">
                  سيتم استيراد جميع الصفوف الموجودة في الملف
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers.map((header, index) => (
                        <th key={index} className="text-right px-4 py-3 text-sm font-medium text-gray-700 border-l border-gray-200 last:border-l-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 border-l border-gray-100 last:border-l-0">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (selectedFile) {
                    processFile(selectedFile);
                  }
                }}
                className="btn-primary flex-1"
              >
                تأكيد الاستيراد
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
