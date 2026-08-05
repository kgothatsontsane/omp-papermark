import React from "react";

interface RedactionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

export const RedactionConfigDialog = ({ open, onOpenChange, documentName }: RedactionConfigDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 border dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configure Redaction</h2>
        <p className="mt-2 text-sm text-gray-500">Managing sensitive content for: <strong>{documentName}</strong></p>
        
        {/* Core UI logic placeholder */}
        <div className="my-4 p-4 border border-dashed rounded text-center text-sm text-gray-400">
          Redaction core algorithms operate via separate Trigger.dev tasks.
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
