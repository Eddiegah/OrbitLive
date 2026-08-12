import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrbitLive — The solar system, right now",
  description: "A flyable 3D solar system with real planetary positions, computed live from actual orbital mechanics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
