import { SystemDefaultsProvider } from '@/contexts/SystemDefaultsContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SystemDefaultsProvider>
          {children}
        </SystemDefaultsProvider>
      </body>
    </html>
  );
} 