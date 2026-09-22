import React from 'react';
import { UploadCloud } from 'lucide-react';

interface WelcomeScreenProps {
  onNavigateToUpload: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNavigateToUpload
}) => {
  return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
        <UploadCloud className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          VIGOR Intelligence
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          No workbook loaded. Upload a performance workbook to begin analysis.
        </p>
      </div>

      <div>
        <button
          type="button"
          id="welcome-upload-btn"
          onClick={onNavigateToUpload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Workbook</span>
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Supported formats: .xlsx, .xls, .csv
      </p>
    </div>
  );
};
