import Link from "next/link";
import { denial } from "@/lib/seed";

export default function LegacyHome() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[#1a3f7a]">My Claims &amp; Authorizations</h1>
      <p className="mt-1 text-xs text-[#555]">Showing activity for the last 90 days. For older items, contact Member Services.</p>
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#dde5f0] text-left">
            <th className="border border-[#bbb] px-2 py-1">Reference</th>
            <th className="border border-[#bbb] px-2 py-1">Type</th>
            <th className="border border-[#bbb] px-2 py-1">Service</th>
            <th className="border border-[#bbb] px-2 py-1">Date</th>
            <th className="border border-[#bbb] px-2 py-1">Status</th>
            <th className="border border-[#bbb] px-2 py-1">Documents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#bbb] px-2 py-1">{denial.authNumber}</td>
            <td className="border border-[#bbb] px-2 py-1">Prior Authorization</td>
            <td className="border border-[#bbb] px-2 py-1">MRI KNEE W/O CONTRAST (73721)</td>
            <td className="border border-[#bbb] px-2 py-1">08/17/2026</td>
            <td className="border border-[#bbb] px-2 py-1 font-bold text-[#a00]">DENIED</td>
            <td className="border border-[#bbb] px-2 py-1"><Link href={`/legacy/denials/${denial.id}`} className="text-[#1a3f7a] underline">View</Link></td>
          </tr>
          <tr>
            <td className="border border-[#bbb] px-2 py-1">CL-2026-0813-7712</td>
            <td className="border border-[#bbb] px-2 py-1">Claim</td>
            <td className="border border-[#bbb] px-2 py-1">OFFICE VISIT EST PT (99213)</td>
            <td className="border border-[#bbb] px-2 py-1">08/12/2026</td>
            <td className="border border-[#bbb] px-2 py-1">PROCESSED</td>
            <td className="border border-[#bbb] px-2 py-1"><span className="text-[#1a3f7a] underline">EOB (PDF)</span></td>
          </tr>
          <tr>
            <td className="border border-[#bbb] px-2 py-1">CL-2026-0804-6620</td>
            <td className="border border-[#bbb] px-2 py-1">Claim</td>
            <td className="border border-[#bbb] px-2 py-1">THERAPEUTIC EXERCISE (97110)</td>
            <td className="border border-[#bbb] px-2 py-1">08/04/2026</td>
            <td className="border border-[#bbb] px-2 py-1">PROCESSED</td>
            <td className="border border-[#bbb] px-2 py-1"><span className="text-[#1a3f7a] underline">EOB (PDF)</span></td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-xs text-[#555]">Questions about a denial? Call Member Services at 1-800-555-0190, Monday–Friday 8 a.m.–5 p.m. Pacific.</p>
    </div>
  );
}
