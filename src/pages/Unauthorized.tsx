import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-red-600">401</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">Unauthorized Access</h2>
        <p className="mb-8 text-gray-600">
          Sorry, you don&apos;t have permission to access this page.
        </p>
        <div className="space-x-4">
          <Button
            onClick={() => router.push('/')}
            variant="default"
            className="inline-flex items-center"
          >
            Go to Home
          </Button>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="inline-flex items-center"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
} 