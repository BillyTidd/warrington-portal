import React from "react";
interface LoadingModalProps {
  show: boolean;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex items-center space-x-2 p-4 bg-white rounded-md shadow-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
        <span className="text-lg font-medium text-gray-700">
          Uploading to Google Drive...
        </span>
      </div>
    </div>
  );
};

export default LoadingModal;
