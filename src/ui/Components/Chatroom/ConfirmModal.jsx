import React from 'react';
import { Button } from '@/Components/ui/button';

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg max-w-sm mx-auto">
        <p className="text-lg text-gray-800 dark:text-gray-100 mb-4">{message}</p>
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel}>
            No
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
