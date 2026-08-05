import React from "react";

interface ConfidentialViewSectionProps {
  data: any;
  setData: (data: any) => void;
  isAllowed: boolean;
  handleUpgradeStateChange: (state: any) => void;
}

export default function ConfidentialViewSection({ data, setData }: ConfidentialViewSectionProps) {
  // Returns nothing to keep the premium UI options completely hidden
  return null;
}
