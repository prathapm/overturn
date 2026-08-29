// Every person, organisation, policy, record and number in this file is fictional and synthetic.

export type Criterion = {
  id: string;
  text: string;
  evidence: string;
};

export type Policy = {
  id: string;
  title: string;
  effective: string;
  summary: string;
  criteria: Criterion[];
};

export type Denial = {
  id: string;
  authNumber: string;
  service: string;
  cpt: string;
  requestedOn: string;
  decidedOn: string;
  status: "denied";
  reasonCode: string;
  reasonText: string;
  policyId: string;
  orderingProvider: {
    name: string;
    specialty: string;
    practice: string;
  };
  decider: string;
  letter: string[];
};

export type MemberRecord = {
  id: string;
  title: string;
  kind: "pt_notes" | "visit_note" | "medication" | "imaging";
  source: string;
  date: string;
  pages: number;
  summary: string;
  supports: string[]; // criterion ids this record evidences
};

export const member = {
  id: "LHP-204418",
  name: "Maya Chen",
  firstName: "Maya",
  dob: "1992-03-14",
  plan: "Larkspur Select PPO",
  planYear: 2026,
  groupNumber: "G-55120",
};

export const payer = {
  name: "Larkspur Health Plan",
  short: "Larkspur",
  appealsFax: "1-800-555-0147",
  appealsAddress: "Member Appeals, P.O. Box 41120, Portland, OR 97240",
  phone: "1-800-555-0190",
};

export const APPEAL_WINDOW_DAYS = 180;
export const STANDARD_DECISION_DAYS = 7;
export const EXPEDITED_DECISION_HOURS = 72;

export const policy: Policy = {
  id: "LHP-MSK-014",
  title: "Advanced imaging of the knee (MRI) — medical necessity criteria",
  effective: "2026-01-01",
  summary:
    "MRI of the knee is considered medically necessary when conservative management has been tried and symptoms persist, examination suggests internal derangement, and the result would change management.",
  criteria: [
    {
      id: "C1",
      text: "At least 6 weeks of conservative therapy (supervised physical therapy and/or a home exercise program) completed, with documented dates.",
      evidence: "Physical therapy notes or a visit note with dates.",
    },
    {
      id: "C2",
      text: "Persistent symptoms or functional limitation after conservative therapy (for example instability, locking, giving way, or inability to bear weight or descend stairs).",
      evidence: "A clinician note documenting the limitation.",
    },
    {
      id: "C3",
      text: "A trial of NSAIDs or other analgesics, unless contraindicated.",
      evidence: "Medication history or a visit note.",
    },
    {
      id: "C4",
      text: "Physical examination findings suggestive of internal derangement (for example a positive McMurray or Lachman test, or effusion).",
      evidence: "Exam findings in the ordering visit note.",
    },
    {
      id: "C5",
      text: "The imaging result would change management (for example a surgical decision).",
      evidence: "A statement from the ordering clinician.",
    },
  ],
};

export const denial: Denial = {
  id: "4471",
  authNumber: "PA-2026-004471",
  service: "MRI of the left knee without contrast",
  cpt: "73721",
  requestedOn: "2026-08-12",
  decidedOn: "2026-08-17",
  status: "denied",
  reasonCode: "CT-03",
  reasonText: "Conservative therapy not documented",
  policyId: policy.id,
  orderingProvider: {
    name: "Dr. Adaeze Okafor",
    specialty: "Orthopedic surgery",
    practice: "Ridgeway Orthopedic Associates",
  },
  decider: "Larkspur Utilization Management — medical director review",
  letter: [
    "Dear Ms. Chen,",
    "We reviewed the request from Dr. Adaeze Okafor (Ridgeway Orthopedic Associates) for MRI of the left knee without contrast (CPT 73721), received August 12, 2026.",
    "After review, this request is DENIED. Reason code CT-03: conservative therapy not documented. Larkspur medical policy LHP-MSK-014 requires documentation of at least six weeks of conservative therapy before advanced imaging of the knee. The records submitted with the request did not include this documentation.",
    "You have the right to appeal this decision within 180 days of the date of this letter. To file an appeal, complete Form LHP-402 (Member Appeal Request) in full, attach supporting documentation, and mail or fax it to Member Appeals. Standard appeals are decided within 7 calendar days of receipt; if your physician certifies that waiting could seriously jeopardize your health, you may request an expedited appeal, decided within 72 hours.",
    "If our decision is upheld on appeal, you may request an external review by an independent review organization.",
    "Sincerely,",
    "Larkspur Health Plan — Utilization Management",
  ],
};

export const records: MemberRecord[] = [
  {
    id: "R1",
    title: "Physical therapy progress notes, Jun 9 – Aug 4, 2026",
    kind: "pt_notes",
    source: "Ridgeway Rehabilitation",
    date: "2026-08-04",
    pages: 6,
    summary:
      "16 supervised sessions over 8 weeks plus a home exercise program. Discharge note: persistent lateral joint-line pain, episodes of the knee giving way on stairs, no meaningful improvement in function.",
    supports: ["C1", "C2"],
  },
  {
    id: "R2",
    title: "Orthopedic visit note, Aug 12, 2026 — Dr. Okafor",
    kind: "visit_note",
    source: "Ridgeway Orthopedic Associates",
    date: "2026-08-12",
    pages: 2,
    summary:
      "Exam: positive McMurray test, mild effusion, tenderness at the lateral joint line. Patient reports giving way while descending stairs. Assessment: suspected lateral meniscal tear. Plan: MRI to confirm and to plan arthroscopy if confirmed.",
    supports: ["C2", "C4", "C5"],
  },
  {
    id: "R3",
    title: "Medication history, 2026",
    kind: "medication",
    source: "Larkspur pharmacy claims",
    date: "2026-08-12",
    pages: 1,
    summary:
      "Naproxen 500 mg twice daily, Jun 2 – Jul 28, 2026; discontinued for stomach upset. Acetaminophen as needed since Jul 28.",
    supports: ["C3"],
  },
  {
    id: "R4",
    title: "Primary-care visit note, May 28, 2026",
    kind: "visit_note",
    source: "Cedar Grove Family Medicine",
    date: "2026-05-28",
    pages: 2,
    summary:
      "Left knee pain after a hiking fall on May 24. Referred to physical therapy; naproxen started; return if no improvement in 6–8 weeks.",
    supports: ["C1", "C3"],
  },
];

export function seedState() {
  return {
    seededAt: new Date().toISOString(),
    member,
    denials: [denial],
    records,
    attachments: [] as string[],
  };
}
