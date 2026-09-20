import type { Metadata } from "next";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PasswordForm } from "@/components/dashboard/password-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <SettingsForm />
      <div className="mx-auto max-w-2xl">
        <PasswordForm />
      </div>
    </>
  );
}
