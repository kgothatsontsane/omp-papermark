"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useState } from "react";

import { signInWithPasskey } from "@teamhanko/passkeys-next-auth-provider/client";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { BRAND_LOGO, BRAND_NAME, SUPPORT_EMAIL } from "@/lib/branding";

import { LastUsed, useLastUsed } from "@/components/hooks/useLastUsed";
import Google from "@/components/shared/icons/google";
import LinkedIn from "@/components/shared/icons/linkedin";
import Passkey from "@/components/shared/icons/passkey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SECURITY_POINTS = [
  {
    label: "Access",
    title: "Role-based access control",
    description:
      "You only ever see the folders and files you're cleared to see — nothing more.",
  },
  {
    label: "Perms",
    title: "Per-viewer permissions",
    description:
      "View, download and share rights are set per role — granular and auditable.",
  },
  {
    label: "Trace",
    title: "Session watermarks",
    description:
      "Your name, time and IP watermark every page you open — so activity is transparent.",
  },
  {
    label: "Audit",
    title: "Full audit trail",
    description:
      "Who viewed what, when — recorded page by page, defensible on both sides.",
  },
];

const EQ_BARS = [26, 40, 22, 58, 34, 68, 30, 46, 24, 54, 38, 62];

const COMPLIANCE_BADGES = [
  "SOC 2 certified infra",
  "GDPR-ready",
  "AES-256 encryption",
  "TLS in transit",
];

export default function Login() {
  const { next } = useParams as { next?: string };

  const [lastUsed, setLastUsed] = useLastUsed();
  const authMethods = ["google", "email", "linkedin", "passkey"] as const;
  type AuthMethod = (typeof authMethods)[number];
  const [clickedMethod, setClickedMethod] = useState<AuthMethod | undefined>(
    undefined,
  );
  const [email, setEmail] = useState<string>("");
  const [emailButtonText, setEmailButtonText] = useState<string>(
    "Continue with Email",
  );

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Please enter a valid email." })
    .email({ message: "Please enter a valid email." });

  const emailValidation = emailSchema.safeParse(email);

  return (
    <>
      <style>{`
        @keyframes omp-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes omp-eq {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        .omp-rise {
          opacity: 0;
          animation: omp-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .omp-eq-bar {
          transform-origin: bottom;
          animation: omp-eq 2.8s ease-in-out infinite;
        }
      `}</style>

      <div className="flex min-h-screen w-full flex-wrap bg-[#faf9f7]">
        {/* Left — sign in */}
        <div className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 md:px-10 lg:w-1/2">
          <div className="omp-rise w-full max-w-md">
            <img
              src={BRAND_LOGO}
              alt={`${BRAND_NAME} Logo`}
              className="mb-12 h-14 w-auto"
            />

            <p
              className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-700"
              style={{ animationDelay: "60ms" }}
            >
              Private Deal Room
            </p>
            <h1
              className="text-balance text-4xl font-medium leading-[1.08] tracking-tight text-stone-900"
              style={{ animationDelay: "120ms" }}
            >
              Sign in to your
              <br />
              deal room.
            </h1>
            <p
              className="mt-4 max-w-sm text-balance leading-relaxed text-stone-500"
              style={{ animationDelay: "180ms" }}
            >
              Private, role-based access to {BRAND_NAME}&apos;s deal room —
              only the documents you&apos;re cleared to see, with your activity
              protected and transparent.
            </p>

            <form
              className="mt-10 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!emailValidation.success) {
                  toast.error(emailValidation.error.errors[0].message);
                  return;
                }

                setClickedMethod("email");
                signIn("email", {
                  email: emailValidation.data,
                  redirect: false,
                  ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                }).then((res) => {
                  if (res?.ok && !res?.error) {
                    setEmail("");
                    setLastUsed("credentials");
                    setEmailButtonText("Email sent - check your inbox!");
                    toast.success("Email sent - check your inbox!");
                  } else {
                    setEmailButtonText("Error sending email - try again?");
                    toast.error("Error sending email - try again?");
                  }
                  setClickedMethod(undefined);
                });
              }}
            >
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@open-mic.co.za"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={clickedMethod === "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "h-11 rounded-md border-0 bg-white px-4 text-sm text-stone-900 ring-1 ring-stone-200 transition-shadow placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-amber-600",
                  email.length > 0 && !emailValidation.success
                    ? "ring-red-500"
                    : "ring-stone-200",
                )}
              />
              <div className="relative">
                <Button
                  type="submit"
                  loading={clickedMethod === "email"}
                  disabled={!emailValidation.success || !!clickedMethod}
                  className={cn(
                    "h-11 w-full transform rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-stone-800",
                    clickedMethod === "email" && "bg-stone-800",
                  )}
                >
                  {emailButtonText}
                </Button>
                {lastUsed === "credentials" && <LastUsed />}
              </div>
            </form>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-stone-200" />
              <span className="text-xs uppercase tracking-widest text-stone-400">
                or
              </span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="flex flex-col space-y-2.5">
              <div className="relative">
                <Button
                  onClick={() => {
                    setClickedMethod("google");
                    setLastUsed("google");
                    signIn("google", {
                      ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                    }).then((res) => {
                      setClickedMethod(undefined);
                    });
                  }}
                  loading={clickedMethod === "google"}
                  disabled={clickedMethod && clickedMethod !== "google"}
                  className="h-11 w-full items-center justify-center space-x-2 rounded-md border border-stone-300 bg-white font-normal text-stone-800 shadow-sm hover:bg-stone-50"
                >
                  <Google className="h-5 w-5" />
                  <span>Continue with Google</span>
                  {clickedMethod !== "google" && lastUsed === "google" && (
                    <LastUsed />
                  )}
                </Button>
              </div>
              <div className="relative">
                <Button
                  onClick={() => {
                    setClickedMethod("linkedin");
                    setLastUsed("linkedin");
                    signIn("linkedin", {
                      ...(next && next.length > 0 ? { callbackUrl: next } : {}),
                    }).then((res) => {
                      setClickedMethod(undefined);
                    });
                  }}
                  loading={clickedMethod === "linkedin"}
                  disabled={clickedMethod && clickedMethod !== "linkedin"}
                  className="h-11 w-full items-center justify-center space-x-2 rounded-md border border-stone-300 bg-white font-normal text-stone-800 shadow-sm hover:bg-stone-50"
                >
                  <LinkedIn />
                  <span>Continue with LinkedIn</span>
                  {clickedMethod !== "linkedin" && lastUsed === "linkedin" && (
                    <LastUsed />
                  )}
                </Button>
              </div>
              <div className="relative">
                <Button
                  onClick={() => {
                    setLastUsed("passkey");
                    setClickedMethod("passkey");
                    signInWithPasskey({
                      tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID as string,
                    }).then(() => {
                      setClickedMethod(undefined);
                    });
                  }}
                  variant="outline"
                  loading={clickedMethod === "passkey"}
                  disabled={clickedMethod && clickedMethod !== "passkey"}
                  className="h-11 w-full items-center justify-center space-x-2 rounded-md border border-stone-300 bg-white font-normal text-stone-800 shadow-sm hover:bg-stone-50 hover:text-stone-800"
                >
                  <Passkey className="h-4 w-4" />
                  <span>Continue with a passkey</span>
                  {lastUsed === "passkey" && <LastUsed />}
                </Button>
              </div>
            </div>

            <p className="mt-8 text-xs leading-relaxed text-stone-400">
              By continuing, you acknowledge that you have read and agree to{" "}
              {BRAND_NAME}&apos;s{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`}
                target="_blank"
                className="underline underline-offset-2 hover:text-stone-600"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`}
                target="_blank"
                className="underline underline-offset-2 hover:text-stone-600"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Right — brand panel */}
        <div className="relative hidden w-full justify-center overflow-hidden bg-[#0e0c0a] md:flex md:w-1/2 lg:w-1/2">
          <div
            className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-amber-500/[0.14] blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-orange-600/[0.10] blur-3xl"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />

          <div className="relative z-10 flex h-full w-full items-center justify-center p-10 lg:p-16">
            <div className="omp-rise w-full max-w-lg" style={{ animationDelay: "120ms" }}>
              <div className="mb-12 flex items-center gap-6">
                <img
                  src={BRAND_LOGO}
                  alt={`${BRAND_NAME} Logo`}
                  className="h-9 w-auto"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
                <div className="flex h-9 items-end gap-[3px] opacity-80" aria-hidden="true">
                  {EQ_BARS.map((h, i) => (
                    <span
                      key={i}
                      className="omp-eq-bar w-[3px] rounded-t-sm bg-amber-500/70"
                      style={{ height: `${h}px`, animationDelay: `${i * 0.11}s` }}
                    />
                  ))}
                </div>
              </div>

              <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-500/90">
                Open Mic Productions
              </p>
              <h2 className="text-balance text-4xl font-medium leading-[1.1] tracking-tight text-white lg:text-5xl">
                Your work deserves
                <br />
                a quiet room.
              </h2>
              <p className="mt-5 max-w-md text-balance leading-relaxed text-stone-400">
                A private deal room for the documents that move your business —
                shared on your terms, tracked page by page.
              </p>

              <ul className="mt-10 space-y-0">
                {SECURITY_POINTS.map((point) => (
                  <li
                    key={point.title}
                    className="flex items-start gap-5 border-t border-white/10 py-5"
                  >
                    <span className="mt-0.5 w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/80">
                      {point.label}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {point.title}
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-stone-400">
                        {point.description}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-stone-500">
                <span>Need help?</span>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-amber-400/90 hover:text-amber-300"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  Security &amp; Compliance
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMPLIANCE_BADGES.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-stone-300"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-500">
                  Hosted on SOC 2 Type II certified infrastructure (Vercel and
                  Cloudflare). Documents are encrypted at rest with AES-256 and
                  in transit over TLS, with role-based access and a full audit
                  trail on every view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
