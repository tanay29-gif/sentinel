import { redirect } from "next/navigation";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/assests/github_icon";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  error?: string;
}>;

const errorCopy: Record<string, string> = {
  "missing-name": "Enter your full name.",
  "profile-update-failed": "Could not save your profile. Try again.",
};

async function startSignUp(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const avatarUrl = user.user_metadata?.avatar_url; 


  if (!fullName) {
    redirect("/sign-up?error=missing-name");
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      onboarding_completed: false,
    },
  });

  if (error) {
    redirect("/sign-up?error=profile-update-failed");
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    avatar_url: avatarUrl,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("Profile upsert failed before GitHub install:", profileError);
    redirect("/sign-up?error=profile-update-failed");
  }

  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "sentinal-github";
  const installUrl = new URL(`https://github.com/apps/${githubAppSlug}/installations/new`);
  installUrl.searchParams.set("state", "onboarding");

  console.log("Redirecting to GitHub App installation at", installUrl.toString());
  redirect(installUrl.toString());
}

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (user.user_metadata?.onboarding_completed) {
    redirect("/");
  }

  const params = await searchParams;
  const message = params.error ? errorCopy[params.error] : null;
  const defaultName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name || "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4 text-slate-950">
      <Card className="w-full max-w-lg rounded-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Command className="size-5" />
          </div>
          <CardTitle>Finish sign up</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={startSignUp} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Email address</span>
              <Input value={user.email} disabled className="bg-slate-50 opacity-70" />
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Full name</span>
              <Input name="full_name" required defaultValue={defaultName} placeholder="Asha Mehta" />
            </label>

            {message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

            <Button className="w-full" size="lg" type="submit">
              <span className="[&_svg]:size-4">
                <GitHubIcon />
              </span>
              Install GitHub App
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
