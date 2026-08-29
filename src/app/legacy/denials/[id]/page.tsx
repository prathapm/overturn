import Link from "next/link";
import { denial, payer } from "@/lib/seed";

export default async function LegacyDenial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== denial.id) return <div>Reference not found.</div>;
  return (
    <div>
      <div className="text-xs"><Link href="/legacy" className="text-[#1a3f7a] underline">« Back to Claims &amp; Authorizations</Link></div>
      <h1 className="mt-2 text-xl font-bold text-[#1a3f7a]">Prior Authorization {denial.authNumber}</h1>
      <table className="mt-3 text-xs">
        <tbody>
          <tr><td className="pr-4 py-0.5 font-bold">Service</td><td>MRI KNEE W/O CONTRAST (73721)</td></tr>
          <tr><td className="pr-4 py-0.5 font-bold">Requesting provider</td><td>OKAFOR, ADAEZE MD</td></tr>
          <tr><td className="pr-4 py-0.5 font-bold">Date received</td><td>08/12/2026</td></tr>
          <tr><td className="pr-4 py-0.5 font-bold">Determination</td><td className="font-bold text-[#a00]">DENIED — 08/17/2026</td></tr>
          <tr><td className="pr-4 py-0.5 font-bold">Reason</td><td>See attached determination letter</td></tr>
        </tbody>
      </table>

      <h2 className="mt-5 font-bold">Documents</h2>
      <ul className="mt-1 list-disc pl-5 text-xs">
        <li><a className="text-[#1a3f7a] underline" href="/legacy/documents/Determination_Letter_PA-2026-004471.pdf" target="_blank">Determination_Letter_PA-2026-004471.pdf</a> (2 pages)</li>
      </ul>

      <h2 className="mt-5 font-bold">How to file an appeal</h2>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
        <li>Download and print <a className="text-[#1a3f7a] underline" href="/legacy/documents/Form_LHP-402_Member_Appeal_Request.pdf" target="_blank">Form LHP-402 — Member Appeal Request</a> (6 pages).</li>
        <li>Complete all sections in blue or black ink. Incomplete forms will be returned.</li>
        <li>Attach copies of supporting medical documentation. Do not send originals.</li>
        <li>
          Mail to: {payer.appealsAddress}<br />
          <span className="font-bold">or fax to: {payer.appealsFax}</span>
        </li>
        <li>Allow up to 7 calendar days from receipt for a standard appeal decision. Expedited appeals require a physician certification (Section 5 of the form).</li>
      </ol>
      <p className="mt-4 text-xs text-[#555]">Appeals cannot be submitted through this website at this time.</p>
    </div>
  );
}
