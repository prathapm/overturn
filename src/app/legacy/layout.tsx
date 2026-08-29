import Link from "next/link";
import { payer } from "@/lib/seed";

export const metadata = { title: "Larkspur Health Plan — Member Services (legacy)" };

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legacy min-h-screen bg-[#e9e9e9] text-[#222]">
      <div className="bg-[#1a3f7a] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-lg font-bold">{payer.name} — Member Services</div>
          <div className="text-xs">
            Member ID LHP-204418 · <Link href="/" className="underline">Switch to the new portal</Link>
          </div>
        </div>
        <div className="bg-[#2d5aa0]">
          <div className="mx-auto flex max-w-5xl gap-6 px-4 py-1.5 text-xs">
            <Link href="/legacy" className="underline">Home</Link>
            <Link href="/legacy" className="underline">Claims &amp; Authorizations</Link>
            <span>Benefits</span><span>Find a Doctor</span><span>Forms Library</span><span>Contact Us</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="border border-[#bbb] bg-white p-5 text-sm">{children}</div>
        <p className="mt-3 text-[11px] text-[#555]">
          This is the deliberately typical “before” version of the portal: no site tools, PDF letters, and a fax number. Everything here is fictional.
        </p>
      </div>
    </div>
  );
}
