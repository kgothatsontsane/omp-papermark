import { useState } from "react";

import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveButton } from "@/components/ui/responsive-button";

export default function DownloadDataroomButton({
  teamId,
  dataroomId,
}: {
  teamId: string;
  dataroomId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const downloadDataroom = async () => {
    setIsLoading(true);
    try {
      toast.promise(
        fetch(`/api/teams/${teamId}/datarooms/${dataroomId}/download/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        {
          loading: "Downloading dataroom...",
          success: async (response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch download URL");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "dataroom.zip";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
              window.URL.revokeObjectURL(url);
              document.body.removeChild(link);
            }, 1000);

            return "Dataroom downloaded successfully.";
          },
          error: (error) => {
            console.log(error);
            return (
              error.message || "An error occurred while downloading dataroom."
            );
          },
        },
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <ResponsiveButton
      icon={<DownloadIcon className="h-4 w-4" />}
      text="Download"
      onClick={downloadDataroom}
      variant="outline"
      size="sm"
      loading={isLoading}
    />
  );
}
