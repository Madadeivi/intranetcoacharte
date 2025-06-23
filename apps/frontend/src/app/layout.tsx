import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner';
import { AuthInitializer } from '../components/AuthInitializer';

export const metadata: Metadata = {
  title: "Intranet Coacharte",
  description: "Intranet para empleados de Coacharte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthInitializer>
          {children}
        </AuthInitializer>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
