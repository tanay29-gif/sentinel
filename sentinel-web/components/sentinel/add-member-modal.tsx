"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type MemberOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const demoMembers: MemberOption[] = [
  { id: "1", name: "Ava Patel", email: "ava@acme.dev", role: "Engineering" },
  { id: "2", name: "Jordan Kim", email: "jordan@acme.dev", role: "Product" },
  { id: "3", name: "Mina Silva", email: "mina@acme.dev", role: "QA" },
  { id: "4", name: "Leo Grant", email: "leo@acme.dev", role: "Ops" },
];

type AddMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamId: string;
};

export function AddMemberModal({ isOpen, onClose, teamName, teamId }: AddMemberModalProps) {
  const [query, setQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [limit, setLimit] = useState(5); // Add this state at the top
  const [selectedRole, setSelectedRole] = useState("Engineer");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    const fetchExistingMembers = async () => {
      const { data } = await supabase
        .from("memberships") // Your bridge table
        .select("user_id")
        .eq("team_id", teamId);

      if (data) {
        setBlockedIds(data.map((m) => m.user_id));
      }
    };

    fetchExistingMembers();
  }, [isOpen, teamId]);




  useEffect(() => {
    const searchProfiles = async () => {
      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, email")
        .limit(limit);

      // Exclude existing members to reduce list clutter
      if (blockedIds.length > 0) {
        queryBuilder = queryBuilder.not("id", "in", `(${blockedIds.join(",")})`);
      }

      if (query.trim().length > 0) {
        queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
      }

      const { data } = await queryBuilder;

      if (data) {
        setMembers(data.map((p) => ({
          id: p.id,
          name: p.full_name,
          email: p.email,
          role: "Engineer",
        })));
      }
    };

    const timeoutId = setTimeout(searchProfiles, 300);
    return () => clearTimeout(timeoutId);
  }, [query, limit, blockedIds]);



  const handleAddMember = async () => {
    if (!selectedMemberId) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from("memberships")
      .insert({
        team_id: teamId,
        user_id: selectedMemberId,
        role: selectedRole.toLowerCase(), // "Owner" becomes "owner" to match your table
        created_at: new Date().toISOString(),
      });

    setIsSubmitting(false);

    if (error) {
      console.error("Error adding member:", error.message);
      alert("Could not add member: " + error.message);
    } else {
      // Successfully added
      onClose();
      // Optional: window.location.reload() to show the new member in the list
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <UserPlus className="size-4" />
              Add member
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{teamName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close add member dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600">
            Search for teammates and invite them into this team. This view is currently UI-only and does not connect to
            Supabase yet.
          </p>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </label>

          <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
            {members.length ? (
              <>
                {members.map((member) => {
                  const isSelected = selectedMemberId === member.id;

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`flex w-full flex-col gap-2 rounded-md border p-3 transition cursor-pointer ${isSelected
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>

                        {/* Show Role Dropdown ONLY when selected */}
                        {isSelected ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent deselecting member
                            className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-black outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="Owner">Owner</option>
                            <option value="Engineer">Engineer</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* See All Button - Only shows if we haven't increased limit yet */}
                {limit === 5 && members.length === 5 && (
                  <button
                    onClick={() => setLimit(20)}
                    className="w-full py-2 text-xs font-medium text-emerald-600 hover:underline"
                  >
                    See all results
                  </button>
                )}
              </>
            ) : (
              <p className="rounded-md bg-white px-3 py-3 text-sm text-slate-500 text-center">
                No teammates found.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{selectedMemberId ? "Member selected for invitation" : "Pick a person to invite"}</p>
            <Button
              type="button"
              onClick={handleAddMember}
              disabled={!selectedMemberId || isSubmitting}
              className="bg-black font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
