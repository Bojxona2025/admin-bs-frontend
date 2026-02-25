
import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export const DeleteConfirmModal = ({ 
  isOpen = false, 
  onClose, 
  onConfirm, 
  title = "O'chirishni tasdiqlash",
  message = "Haqiqatan ham bu elementni o'chirishni xohlaysizmi? Bu amal bekor qilinmaydi.",
  itemName = "",
  loading = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {/* <div className="p-6">
          <p className="text-gray-600 mb-4">
            {message}
          </p>
          {itemName && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-500">O'chiriladigan element:</p>
              <p className="font-medium text-gray-900">{itemName}</p>
            </div>
          )}
        </div> */}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 cursor-pointer text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>O'chirilmoqda...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>O'chirish</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};