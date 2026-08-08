import Link from "next/link";

import { useState } from "react";

import { isSelfHostedMode } from "@/lib/self-hosted";
import { CircleHelpIcon, InfoIcon, UsersIcon } from "lucide-react";

import { DataroomHeader } from "@/components/datarooms/dataroom-header";
import { DataroomNavigation } from "@/components/datarooms/dataroom-navigation";
import { AddGroupModal } from "@/components/datarooms/groups/add-group-modal";
import GroupCard from "@/components/datarooms/groups/group-card";
import { GroupCardPlaceholder } from "@/components/datarooms/groups/group-card-placeholder";
import AppLayout from "@/components/layouts/app";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BadgeTooltip } from "@/components/ui/tooltip";

import { usePlan } from "@/lib/swr/use-billing";
import { useDataroom } from "@/lib/swr/use-dataroom";
import useDataroomGroups from "@/lib/swr/use-dataroom-groups";
import { cn } from "@/lib/utils";

export default function DataroomGroupPage() {
  const { isDatarooms, isDataroomsPlus, isTrial } = usePlan();
  const { dataroom } = useDataroom();
  const { viewerGroups, loading } = useDataroomGroups();

  const [modalOpen, setModalOpen] = useState<boolean>(false);

  if (!dataroom) {
    return <div>Loading...</div>;
  }

  const canCreateGroup =
    isSelfHostedMode() || isDatarooms || isDataroomsPlus || isTrial;

  const ButtonComponent = () => {
    if (canCreateGroup) {
      return <Button onClick={() => setModalOpen(true)}>Create group</Button>;
    }
    // ponytail: in non-self-hosted mode, show upgrade button for free plan users
    return (
      <Button disabled>
        Upgrade to create group
      </Button>
    );
  };

  return (
    <AppLayout>
      <div className="relative mx-2 mb-10 mt-4 space-y-8 overflow-hidden px-1 sm:mx-3 md:mx-5 md:mt-5 lg:mx-7 lg:mt-8 xl:mx-10">
        <header>
          <DataroomHeader
            title={dataroom.name}
            description={dataroom.pId}
            actions={[
              <ButtonComponent key={1} />,
              <Link
                key={2}
                href={`/datarooms/${dataroom.id}/groups/invite`}
                className="hidden md:block"
              >
                <Button>Invite viewers</Button>
              </Link>,
            ]}
          />
          <DataroomNavigation dataroomId={dataroom.id} />
        </header>

        <main className="space-y-6">
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All Groups</TabsTrigger>
              <TabsTrigger value="invited">Invited</TabsTrigger>
            </TabsList>

            <Tabs>
              <TabsList className="hidden">
                <TabsTrigger value="group1">Group 1</TabsTrigger>
              </TabsList>
            </Tabs>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <GroupCardPlaceholder key={1} />
                  <GroupCardPlaceholder key={2} />
                  <GroupCardPlaceholder key={3} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {viewerGroups?.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invited" className="space-y-4">
              <div className="py-12 text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-sm font-semibold">No invited groups</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No groups have been invited yet.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AddGroupModal open={modalOpen} setOpen={setModalOpen} />
    </AppLayout>
  );
}
