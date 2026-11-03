import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "The Guildhall | D&D Campaign Hub", description: "A private tabletop campaign hall for your adventuring party." };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
