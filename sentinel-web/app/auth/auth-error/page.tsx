'use client';

import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Authentication failed';
  const errorDescription = searchParams.get('error_description') || 'An error occurred during authentication. Please try again.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
      <Card className="w-full max-w-md rounded-md border-red-200 bg-red-50">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-red-600 text-white">
            <AlertCircle className="size-5" />
          </div>
          <CardTitle className="text-red-900">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-red-800 mb-1">{error}</p>
            <p className="text-sm text-red-700">{errorDescription}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Try the following:</p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Clear your browser cookies</li>
              <li>Ensure your GitHub account is public</li>
              <li>Check your internet connection</li>
              <li>Try again in a few moments</li>
            </ul>
          </div>
          <Link href="/auth" className="block">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
