import { createClient } from "@/lib/supabase/server";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/sentinel/metric-card";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Eye, UserCog } from "lucide-react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

import RoleSelect from "./RoleSelect";


type Props = {
    teamId: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type Member = {
  id: string;
  role: string;
  user_id: string;
  created_at: string;
  profiles: Profile[];
};

export default async function TeamMembers({
    teamId,
}: Props) {
    const supabase = await createClient();

    const {
        data: {
            user,
        },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }


    const { data: myMembership, error: membershipError } = await supabase
        .from("memberships")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .single();

    if (membershipError || !myMembership) {
        return (
            <Card className="rounded-md">
                <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-lg font-semibold text-slate-900">
                        Access Denied
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        You are not a member of this team or your membership could not be verified.
                    </p>
                </CardContent>
            </Card>
        );
    }


    const { data: membersData = [], error: membersError } = await supabase
        .from("memberships")
        .select(
            `
      id,
      role,
      user_id,
      created_at,
  profiles!inner (
    id,
    full_name,
    email,
    avatar_url
  )
    `
        )
        .eq("team_id", teamId)
        .order("created_at");


    if (membersError) {
        console.log(membersError)
    }
    if (!membersData) return (
        <p>Loading...</p>
    )

    const members = membersData as Member[];

    const userRole = myMembership?.role;
    const ownerCount = members.filter(
        (member) => member.role === "owner"
    ).length;

    const engineerCount = members.filter(
        (member) => member.role === "engineer"
    ).length;

    const viewerCount = members.filter(
        (member) => member.role === "viewer"
    ).length;
    return (
        <>
            <div>
                {/* Top Summary */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        title="Members"
                        value={String(members.length)}
                        detail="Current team members"
                        icon={Users}
                        tone="emerald"
                    />

                    <MetricCard
                        title="Owners"
                        value={ownerCount.toString()}
                        detail="Full administrative access"
                        icon={ShieldCheck}
                        tone="red"
                    />

                    <MetricCard
                        title="Engineers"
                        value={engineerCount.toString()}
                        detail="Can manage repositories"
                        icon={UserCog}
                        tone="amber"
                    />

                    <MetricCard
                        title="Viewers"
                        value={viewerCount.toString()}
                        detail="Read-only access"
                        icon={Eye}
                        tone="slate"
                    />
                </section>
            </div>

            <Card className="rounded-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>

                        <CardDescription>
                            Manage team access and permissions.
                        </CardDescription>
                    </div>

                    <Badge variant="outline">
                        {members.length} Members
                    </Badge>
                </CardHeader>

                <CardContent className="space-y-3">
                    {members.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 p-8 text-center">
                            <Users className="mx-auto mb-3 size-8 text-slate-400" />

                            <p className="font-medium text-slate-900">
                                No team members
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Invite members to collaborate with your team.
                            </p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between rounded-md border border-slate-200 p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-11">
                                        <AvatarImage
                                            src={member.profiles[0]?.avatar_url ?? ""}
                                        />

                                        <AvatarFallback>
                                            {member.profiles[0]?.full_name?.charAt(0) ??
                                                "U"}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {member.profiles[0]?.full_name}
                                        </p>

                                        <p className="text-sm text-slate-500">
                                            {member.profiles[0]?.email}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Joined{" "}
                                            {new Date(
                                                member.created_at
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {member.role === "owner" && (
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                            Owner
                                        </Badge>
                                    )}

                                    {member.role === "engineer" && (
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                            Engineer
                                        </Badge>
                                    )}

                                    {member.role === "viewer" && (
                                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                                            Viewer
                                        </Badge>
                                    )}

                                    {userRole === "owner" &&
                                        member.role !== "owner" && (
                                            <RoleSelect
                                                teamId={teamId}
                                                membershipId={member.id}
                                                role={member.role}
                                            />
                                        )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </>
    );
}