import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingSpinner className="h-12 w-12" />
    </div>
  );
}
