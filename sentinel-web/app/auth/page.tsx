import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
      <Card className="w-full max-w-md rounded-md">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Command className="size-5" />
          </div>
          <CardTitle>Sign in to SENTINEL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="work email" type="email" />
          <Input placeholder="password" type="password" />
          <Button className="w-full">Continue</Button>
          <Button variant="outline" className="w-full">Sign in with GitHub</Button>
        </CardContent>
      </Card>
    </main>
  );
}
