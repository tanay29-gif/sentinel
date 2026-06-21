"use client";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      
      // Use ngrok URL for callback in development to avoid SSL issues with localhost
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin).toString();
      
      console.log("GitHub OAuth callback URL:", callbackUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: callbackUrl,
          scopes: 'repo read:user',
        },
      });
      
      console.log("GitHub login data:", data);

      if (error) {
        console.error("GitHub login error:", error);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("GitHub login exception:", err);
      setIsLoading(false);
    }
  };
  
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
          <Button className="w-full" disabled={isLoading}>Continue</Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGitHubLogin}
            disabled={isLoading}
          >
            {isLoading ? "Redirecting to GitHub..." : "Sign in with GitHub"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
