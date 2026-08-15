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
    title: "NDA-gated access",
    description: "Every document sits behind a one-click NDA before it loads.",
  },
  {
    title: "Per-viewer permissions",
    description: "Granular file and folder controls for every participant.",
  },
  {
    title: "Session watermarks",
    description: "Name, time and IP watermarked on every page you open.",
  },
  {
    title: "Full audit trail",
    description: "Who viewed, what, when — accounted for, page by page.",
  },
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
    <div className="flex h-screen w-full flex-wrap">
      {/* Left part — sign in */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 md:w-1/2 lg:w-1/2">
        <div className="z-10 mx-5 w-full max-w-md sm:mx-0">
          <div className="flex flex-col space-y-3 px-4 pb-2 sm:px-0">
            <img
              src={BRAND_LOGO}
              alt={`${BRAND_NAME} Logo`}
              className="mb-6 h-8 w-auto self-start"
            />
            <Link href="/">
              <span className="text-balance text-3xl font-semibold tracking-tight text-gray-900">
                {BRAND_NAME} Deal Room
              </span>
            </Link>
            <h3 className="text-balance text-sm text-gray-600">
              Secure, confidential access to your deal room.
            </h3>
          </div>
          <form
            className="flex flex-col gap-4 px-4 pt-8 sm:px-0"
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
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={clickedMethod === "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border-0 bg-background bg-white px-3 py-2 text-sm text-gray-900 ring-1 ring-gray-200 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white",
                email.length > 0 && !emailValidation.success
                  ? "ring-red-500"
                  : "ring-gray-200",
              )}
            />
            <div className="relative">
              <Button
                type="submit"
                loading={clickedMethod === "email"}
                disabled={!emailValidation.success || !!clickedMethod}
                className={cn(
                  "focus:shadow-outline w-full transform rounded px-4 py-2 text-white transition-colors duration-300 ease-in-out focus:outline-none",
                  clickedMethod === "email"
                    ? "bg-black"
                    : "bg-gray-800 hover:bg-gray-900",
                )}
              >
                {emailButtonText}
              </Button>
              {lastUsed === "credentials" && <LastUsed />}
            </div>
          </form>
          <p className="py-4 text-center">or</p>
          <div className="flex flex-col space-y-2 px-4 sm:px-0">
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
                className="flex w-full items-center justify-center space-x-2 border border-gray-300 bg-gray-100 font-normal text-gray-900 hover:bg-gray-200"
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
                className="flex w-full items-center justify-center space-x-2 border border-gray-300 bg-gray-100 font-normal text-gray-900 hover:bg-gray-200"
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
                className="flex w-full items-center justify-center space-x-2 border border-gray-300 bg-gray-100 font-normal text-gray-900 hover:bg-gray-200 hover:text-gray-900"
              >
                <Passkey className="h-4 w-4" />
                <span>Continue with a passkey</span>
                {lastUsed === "passkey" && <LastUsed />}
              </Button>
            </div>
          </div>
          <p className="mt-10 w-full max-w-md px-4 text-xs text-muted-foreground sm:px-0">
            By clicking continue, you acknowledge that you have read and agree
            to {BRAND_NAME}&apos;s{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/terms`}
              target="_blank"
              className="underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href={`${process.env.NEXT_PUBLIC_MARKETING_URL}/privacy`}
              target="_blank"
              className="underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Right part — brand + security */}
      <div className="relative hidden w-full justify-center overflow-hidden bg-[#0a0e1a] md:flex md:w-1/2 lg:w-1/2">
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative m-0 flex h-full w-full items-center justify-center p-10">
          <div className="w-full max-w-lg">
            <div className="mb-10">
              <img
                src={BRAND_LOGO}
                alt={`${BRAND_NAME} Logo`}
                className="h-9 w-auto opacity-90"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white">
              Your deal room, under your control.
            </h2>
            <p className="mt-4 max-w-md text-balance leading-relaxed text-gray-400">
              {BRAND_NAME} Deal Room is a private, proprietary platform for
              sharing confidential documents — built with security and
              accountability at every step.
            </p>
            <ul className="mt-10 space-y-5">
              {SECURITY_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="flex items-start space-x-4 border-t border-white/10 pt-5"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {point.title}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-gray-400">
                      {point.description}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-10 border-t border-white/10 pt-5 text-sm text-gray-500">
              Need help?{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-indigo-300 hover:text-indigo-200"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
