import React from "react";

interface RedactionJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onStartNew: () => void;
}

export const RedactionJobsDialog = ({ open, onOpenChange }: RedactionJobsDialogProps) => {
  if (!open) return null;
  return null;
};
