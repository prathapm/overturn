export type Severity = "blocker" | "gap" | "note";

export type Evidence = { page: string; snippet: string };

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
  evidence: Evidence[];
};

export type ToolKind = "read" | "write" | "gated";

export type SchemaProp = { type: "string" | "number" | "boolean" | "integer"; description?: string; enum?: string[] };

export type ToolRec = {
  name: string;
  kind: ToolKind;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, SchemaProp>; required?: string[] };
  source: { page: string; affordance: string };
  why: string;
};

export type FormScan = {
  action: string;
  method: string;
  heading: string;
  submitLabel: string;
  fields: { name: string; type: string; label: string; options?: string[]; required: boolean }[];
  hasFile: boolean;
  hasPassword: boolean;
  isSearch: boolean;
};

export type TableScan = { heading: string; headers: string[]; rows: number };

export type PageScan = {
  url: string;
  status: number;
  title: string;
  h1: string;
  forms: FormScan[];
  tables: TableScan[];
  detailPairs: number; // label:value pairs (dl / 2-col tables)
  links: { total: number; sameOrigin: number; pdf: string[]; mailto: string[]; tel: string[]; downloads: string[] };
  iframes: number;
  textSignals: { fax: string[]; mail: string[]; cannotSubmit: string[]; phoneOnly: string[]; printSign: string[]; rules: string[] };
  objectHint: string | null; // the thing the page asks the user to file/submit/request, e.g. "appeal"
  hasModelContext: boolean;
  headers: { originAgentCluster: string | null; permissionsPolicy: string | null };
  pagination: boolean;
  error?: string;
};

export type Report = {
  url: string;
  origin: string;
  scannedAt: string;
  mode: "live" | "fixture";
  elapsedMs: number;
  pages: PageScan[];
  summary: {
    pagesScanned: number;
    forms: number;
    tables: number;
    pdfs: number;
    offlineChannels: number;
    existingWebMCP: boolean;
    headersOk: boolean;
  };
  score: { value: number; grade: "A" | "B" | "C" | "D" | "F"; label: string };
  findings: Finding[];
  tools: ToolRec[];
  generatedCode: string;
  markdown: string;
};
