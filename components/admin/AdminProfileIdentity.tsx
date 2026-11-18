"use client";
import Image from "next/image";
import { Languages, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/AuthControls";
import { useAdminPreferences } from "./AdminPreferences";

export function AdminProfileIdentity({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  const { t, preferences, ready, save } = useAdminPreferences();
  const [notice, setNotice] = useState("");
  const first = name?.split(" ")[0] || "Edmund";
  return (
    <>
      <div className="admin-profile-language">
        <span>
          <Languages size={17} aria-hidden="true" />
          {t("Language")}
        </span>
        <div role="group" aria-label={t("Language")}>
          {(
            [
              ["en", "English"],
              ["zh", "简体中文"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              disabled={!ready}
              aria-pressed={preferences.language === value}
              onClick={() =>
                setNotice(
                  save({ language: value })
                    ? ""
                    : "Preferences saved for this session only.",
                )
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {notice && <p role="status">{t(notice)}</p>}
      <section
        className="admin-profile-identity"
        aria-label={t("Your account")}
      >
        <div className="admin-profile-avatar">
          {image ? (
            <Image src={image} alt="" width={88} height={88} unoptimized />
          ) : (
            first[0].toUpperCase()
          )}
        </div>
        <div className="admin-profile-name">
          <h2>
            {t("Welcome back,")}
            <br />
            {first}.
          </h2>
          <p>{email}</p>
          <span>
            <ShieldCheck size={13} aria-hidden="true" />
            {t("Owner")}
          </span>
        </div>
        <SignOutButton redirectUrl="/sign-in">
          <button
            type="button"
            className="admin-profile-signout"
            aria-label={t("Sign out")}
          >
            <LogOut size={19} aria-hidden="true" />
          </button>
        </SignOutButton>
      </section>
    </>
  );
}
