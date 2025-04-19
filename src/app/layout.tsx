import type { Metadata } from "next";
import "./globals.css";




export const metadata: Metadata = {
  title: "Connect",
  description: "Bridge between Deaf and hearing people",
};



import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}