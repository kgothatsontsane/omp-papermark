import Link from "next/link";
import { useRouter } from "next/router";

import { useEffect } from "react";

import { isSelfHostedMode } from "@/lib/self-hosted";
import { PlusIcon } from "lucide-react";

import { AddDataroomModal } from "@/components/datarooms/add-dataroom-modal";
import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { usePlan } from "@/lib/swr/use-billing";
import useDatarooms from "@/lib/swr/use-datarooms";
import useLimits from "@/lib/swr/use-limits";

export default function DataroomsPage() {
  const { datarooms } = useDatarooms();
  const { isDatarooms, isDataroomsPlus, isFree, isPro, isTrial } = usePlan();
  const { limits } = useLimits();
  const router = useRouter();

  const numDatarooms = datarooms?.length ?? 0;
  const limitDatarooms = limits?.datarooms ?? 1;

  const canCreateUnlimitedDatarooms =
    isSelfHostedMode() ||
    isDatarooms ||
    isDataroomsPlus ||
    (isDatarooms && numDatarooms < limitDatarooms);

  // ponytail: in self-hosted mode, don't redirect free users away from datarooms
  useEffect(() => {
    if (!isSelfHostedMode() && !isTrial && (isFree || isPro)) {
      router.push("/documents");
    }
  }, [isTrial, isFree, isPro, router]);

  if (!isSelfHostedMode() && !isTrial && (isFree || isPro)) {
    return null;
  }

  return (
    <AppLayout>
      <main className="p-4 sm:m-4 sm:px-4 sm:py-4">
        <section className="mb-4 flex items-center justify-between md:mb-8 lg:mb-12">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Datarooms
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage your datarooms
            </p>
          </div>
          <div className="flex items-center gap-x-1">
            <AddDataroomModal>
              <Button
                className="group flex flex-1 items-center justify-start gap-x-3 px-3 text-left"
                title="Create New Document"
              >
                <PlusIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Create New Dataroom</span>
              </Button>
            </AddDataroomModal>
          </div>
        </section>

        <Separator className="mb-5 bg-gray-200 dark:bg-gray-800" />

        <div className="space-y-4">
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2 xl:grid-cols-3">
            {datarooms &&
              datarooms.map((dataroom) => (
                <Link
                  key={dataroom.id}
                  href={`/datarooms/${dataroom.id}/documents`}
                >
                  <Card className="group relative overflow-hidden duration-500 hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="truncate">
                          {dataroom.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <dl className="divide-y divide-gray-100 text-sm leading-6">
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500 dark:text-gray-400">
                            Documents
                          </dt>
                          <dd className="flex items-start gap-x-2">
                            <div className="font-medium text-gray-900 dark:text-gray-200">
                              {dataroom._count.documents ?? 0}
                            </div>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-x-4 py-3">
                          <dt className="text-gray-500 dark:text-gray-400">
                            Views
                          </dt>
                          <dd className="flex items-start gap-x-2">
                            <div className="font-medium text-gray-900 dark:text-gray-200">
                              {dataroom._count.views ?? 0}
                            </div>
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </ul>

          {datarooms && datarooms.length === 0 && (
            <div className="flex items-center justify-center">
              {isSelfHostedMode() ? (
                <div className="text-center">
                  <p className="text-muted-foreground">No datarooms yet</p>
                </div>
              ) : (
                <></>
              )}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}