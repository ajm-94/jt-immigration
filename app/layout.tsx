import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getViewer } from "@/lib/session";
import { logout } from "./_actions/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JT Immigration — Irish citizenship applications",
  description: "Apply for Irish citizenship by naturalisation with JT Immigration. Upload your documents securely and we'll prepare your application.",
};

async function Nav() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return (
    <nav className="flex items-center gap-1 text-sm">
      {viewer.role === "staff" ? (
        <>
          <Link href="/admin" className="rounded-md px-3 py-2 text-slate-700 hover:text-navy">
            Cases
          </Link>
          <Link href="/admin/invite" className="rounded-md px-3 py-2 text-slate-700 hover:text-navy">
            Add client
          </Link>
          <Link href="/account" className="hidden rounded-md px-3 py-2 text-slate-500 hover:text-navy sm:block" title={viewer.email}>
            {viewer.name.split(" ")[0] || "Account"}
          </Link>
        </>
      ) : (
        <Link href="/portal" className="rounded-md px-3 py-2 text-slate-700 hover:text-navy">
          My application
        </Link>
      )}
      <form action={logout}>
        <button className="rounded-md px-3 py-2 text-slate-500 hover:text-navy">Sign out</button>
      </form>
    </nav>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-navy">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-700 text-xs font-bold text-white">JT</span>
              <span className="hidden sm:inline">JT Immigration</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
