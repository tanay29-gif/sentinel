"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleSelectProps = {
  teamId: string;
  membershipId: string;
  role: string;
};

export default function RoleSelect({
  teamId,
  membershipId,
  role,
}: RoleSelectProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(role);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return (
    <div className="w-36 h-9 rounded-md border bg-background" />
  );
}

  async function updateRole(newRole: string) {
    setLoading(true);


    try {
      const res = await fetch(
        `/api/member?teamId=${teamId}&membershipId=${membershipId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();

        alert(error.error ?? "Unable to update role");

        setValue(role);

        return;
      }

      setValue(newRole);

      router.refresh();
    } catch (err) {
      console.error(err);

      alert("Something went wrong.");

      setValue(role);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Select
      value={value}
      disabled={loading}
      onValueChange={(newRole) => {
        setValue(newRole);
        updateRole(newRole);
      }}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="engineer">
          Engineer
        </SelectItem>

        <SelectItem value="viewer">
          Viewer
        </SelectItem>
      </SelectContent>
    </Select>
  );
}