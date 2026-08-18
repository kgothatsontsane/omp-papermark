import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import type posthogJs from "posthog-js";
import type { PostHogProvider as PostHogProviderType } from "posthog-js/react";

import { getPostHogConfig } from "@/lib/posthog";
import { CustomUser } from "@/lib/types";

type PostHogClient = typeof posthogJs;

// ponytail: posthog-js is ~24MB and shipped eagerly in _app, but it's never
// configured here (getPostHogConfig returns null). Dynamically import the SDK
// ONLY when a key is present so the heavy SDK is excluded from the app shell's
// critical-path bundle until PostHog is actually enabled.
export const PostHogCustomProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [PostHogProvider, setPostHogProvider] = useState<
    (typeof PostHogProviderType) | null
  >(null);
  const [posthog, setPosthog] = useState<PostHogClient | null>(null);

  const posthogConfig = getPostHogConfig();

  useEffect(() => {
    let cancelled = false;
    if (!posthogConfig) return;

    Promise.all([import("posthog-js"), import("posthog-js/react")])
      .then(([{ default: ph }, { PostHogProvider: Provider }]) => {
        if (cancelled) return;
        ph.init(posthogConfig.key, {
          api_host: posthogConfig.host,
          ui_host: "https://eu.posthog.com",
          disable_session_recording: true,
          loaded: (loadedPh) => {
            getSession()
              .then((session) => {
                if (session) {
                  loadedPh.identify(
                    (session.user as CustomUser).email ??
                      (session.user as CustomUser).id,
                    {
                      email: (session.user as CustomUser).email,
                      userId: (session.user as CustomUser).id,
                    },
                  );
                } else {
                  loadedPh.reset();
                }
              })
              .catch(() => {
                // Do nothing.
              });
          },
        });
        setPosthog(() => ph);
        setPostHogProvider(() => Provider);
      })
      .catch(() => {
        // Do nothing.
      });

    return () => {
      cancelled = true;
    };
  }, [posthogConfig]);

  if (posthogConfig && PostHogProvider && posthog) {
    return (
      <PostHogProvider client={posthog}>{children}</PostHogProvider>
    );
  }

  return <>{children}</>;
};
