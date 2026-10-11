// Irish citizenship by naturalisation (adult, online route).
// Source: Irish Immigration Service "How to Become an Irish Citizen Guide" and
// "Proofs of identity and residence" (updated 15 April 2026) pages, re-checked 11 October 2026.

export type BasisSlug = "standard" | "spouse" | "refugee";

export type Basis = {
  slug: BasisSlug;
  title: string;
  short: string;
  description: string;
  years: number;
  basisSectionTitle?: string;
};

export type SectionKey = "identity" | "residence" | "immigration" | "basis" | "other";

export type DocumentRequirement = {
  key: string;
  label: string;
  hint: string;
  section: SectionKey;
  /** Sub-heading within a section, e.g. a residence year. */
  group?: string;
  optional?: boolean;
  bases?: BasisSlug[];
  link?: { label: string; href: string };
};

const ISD = "https://www.irishimmigration.ie";

export const FORMS = {
  passportCertification: {
    label: "Passport Certification Form (Citz-011/2026)",
    href: `${ISD}/wp-content/uploads/citizenship/passport-certification-form-citz-0112026.pdf`,
  },
  marriageCertification: {
    label: "Certification of Marriage form",
    href: `${ISD}/wp-content/uploads/citizenship/marriage-certificate-certification-form-citizenship-0052026.pdf`,
  },
  spousalDeclaration: {
    label: "Spousal statutory declaration (STATDEC-13A/2026)",
    href: `${ISD}/wp-content/uploads/citizenship/spousal-declaration-form-citizenship-statdec-13a2026.pdf`,
  },
  civilPartnerDeclaration: {
    label: "Civil partner statutory declaration",
    href: `${ISD}/wp-content/uploads/citizenship/civil-partnership-declaration-form-statdec-13a2026.pdf`,
  },
  residenceAffidavit: {
    label: "Residential Proof Affidavit (Citz-009/2026)",
    href: `${ISD}/wp-content/uploads/citizenship/residency-affidavit-proof-form-citizenship-0092026.pdf`,
  },
  birthAffidavit: {
    label: "Birth Affidavit",
    href: `${ISD}/wp-content/uploads/citizenship/birth-affidavit-citizenship-form-citizenship-0062026.pdf`,
  },
  passportAffidavit: {
    label: "Passport Affidavit",
    href: `${ISD}/wp-content/uploads/citizenship/download-passport-affidavit-form-citizenship-0082026.pdf`,
  },
  certifyingGuide: {
    label: "ISD guide to certifying a document",
    href: `${ISD}/how-to-become-a-citizen/certifying-a-document/`,
  },
};

export const BASES: Basis[] = [
  {
    slug: "standard",
    title: "I've lived in Ireland for 5+ years",
    short: "Standard (5 years)",
    description:
      "1 year of continuous residence right before you apply, plus 4 more years in the 8 years before that.",
    years: 5,
  },
  {
    slug: "spouse",
    title: "I'm married to, or the civil partner of, an Irish citizen",
    short: "Spouse / civil partner",
    description:
      "Married or in a civil partnership for 3+ years and living together, with 3 years' residence on the island of Ireland in the last 5 — including the last 12 months.",
    years: 3,
    basisSectionTitle: "Your marriage or civil partnership",
  },
  {
    slug: "refugee",
    title: "I have refugee status or am stateless",
    short: "Refugee / stateless",
    description: "5 years' residence counted from the date you were granted refugee or stateless status.",
    years: 5,
    basisSectionTitle: "Your status",
  },
];

/** Application types not built yet: shown greyed out in the basis dropdowns so they're visible for later. */
export const COMING_SOON_BASES = [
  "Irish descent / associations — Form 8",
  "Child of a naturalised parent — Form 9",
  "Child of Irish descent / associations — Form 10",
  "Child born in Ireland since 2005 — Form 11",
];

export const SECTIONS: { key: SectionKey; title: string; intro?: string }[] = [
  { key: "identity", title: "Identity" },
  {
    key: "residence",
    title: "Proof of residence",
    intro:
      "Each year you count needs 150 points: one main document (100 points) and one supporting document (50 points). Every document must show your name, your Irish address and a date within that year, and you can't use the same document for two years. Your years don't need to be back to back or full calendar years — only the last 12 months must be continuous, and the rest is added up by days. Use documents dated within the times you were actually living here, and if your time here was broken up, add a cover note listing your periods of residence (see Other documents). Bank statements must be from a bank or credit union regulated by the Central Bank of Ireland or the ECB and show in-person card payments on the island of Ireland (with merchant addresses) — at least 3 a month for 3 consecutive months.",
  },
  { key: "immigration", title: "Immigration history" },
  { key: "basis", title: "Your relationship / status" },
  { key: "other", title: "Other documents" },
];

const MAIN_PROOF_HINT =
  "Any one of: Revenue Employment Detail Summary in your own name (easiest — download from myAccount), a Revenue letter showing your tax record, a bank statement (3 consecutive months with 3+ in-person card payments a month in Ireland), a Social Welfare statement showing contributions or claims, or an employer letter confirming your dates. HSE or voluntary-hospital doctors can use their Medical Practitioner Employment History Summary. Child benefit doesn't count.";
const SUPPORT_PROOF_HINT =
  "Any one of: utility, broadband, phone or bin bill, TV licence, tenancy agreement or RTB letter, credit card statement, Local Property Tax letter, a letter from a doctor or hospital, or a letter from a school, housing authority or IPAS.";

function residenceYears(basis: Basis): DocumentRequirement[] {
  return Array.from({ length: basis.years }, (_, i) => {
    const year = i + 1;
    const group =
      year === 1
        ? "Year 1 — the 12 months right before you apply"
        : year === basis.years
          ? `Year ${year} — your earliest year`
          : `Year ${year}`;
    return [
      { key: `residence-${year}-main`, section: "residence", group, label: "Main document (100 points)", hint: MAIN_PROOF_HINT },
      { key: `residence-${year}-support`, section: "residence", group, label: "Supporting document (50 points)", hint: SUPPORT_PROOF_HINT },
    ] satisfies DocumentRequirement[];
  }).flat();
}

const IDENTITY: DocumentRequirement[] = [
  {
    key: "passport-certified",
    section: "identity",
    bases: ["standard", "spouse"],
    label: "Certified copy of your passport photo page",
    hint: "A full-colour copy of the photo page of your current, in-date passport, signed and dated by a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public who has seen the original in person.",
  },
  {
    key: "passport-certification-form",
    section: "identity",
    bases: ["standard", "spouse"],
    label: "Passport Certification Form",
    hint: "ISD's form, completed and signed by the same person who certified your passport copy.",
    link: FORMS.passportCertification,
  },
  {
    key: "travel-document",
    section: "identity",
    bases: ["refugee"],
    label: "Certified copy of your Irish travel document",
    hint: "Full-colour copy of the photo page, certified in person by a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public.",
  },
  {
    key: "passport-affidavit",
    section: "identity",
    bases: ["refugee"],
    label: "Passport Affidavit",
    hint: "Required for refugee/stateless applicants. It lists every name and date of birth you've used (or states that you've used no others), why you can't get a passport, and how you came to Ireland. Sworn before a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public — not a Garda.",
    link: FORMS.passportAffidavit,
  },
  {
    key: "birth-certificate",
    section: "identity",
    label: "Certified copy of your birth certificate",
    hint: "Now required for all adults. If it isn't in English or Irish, also upload a professional translation. If you genuinely can't get one, upload ISD's Birth Affidavit instead.",
    link: FORMS.birthAffidavit,
  },
  {
    key: "other-identity",
    section: "identity",
    bases: ["standard", "spouse"],
    optional: true,
    label: "Other ID (only if your passport has expired)",
    hint: "Identity needs 150 points; a valid passport covers all of them. If yours has expired, combine: expired passport (75 if expired under a year, otherwise 50), certified IRP card (75), EU national ID card (50), Public Services Card (25), PPS letter (25), Certificate of Identity / Red Cross / UNHCR ID (50), photo driving licence (10).",
  },
];

const IMMIGRATION: DocumentRequirement[] = [
  {
    key: "irp-current",
    section: "immigration",
    label: "Current IRP card",
    hint: "Front and back of your current Irish Residence Permit. It must stay in date until your citizenship ceremony. (EU/EEA, UK and Swiss citizens can skip this.)",
  },
  {
    key: "irp-previous",
    section: "immigration",
    optional: true,
    label: "Previous IRP / GNIB cards and permission letters",
    hint: "Front and back of earlier cards, and letters granting or renewing your permission. These help us check your residence dates. A gap in your permission can make you ineligible.",
  },
];

const BASIS_DOCS: DocumentRequirement[] = [
  {
    key: "marriage-certificate",
    section: "basis",
    bases: ["spouse"],
    label: "Certified copy of your marriage certificate or civil partnership certificate (whichever applies)",
    hint: "Full-colour copy, certified in person by a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public.",
  },
  {
    key: "marriage-certification-form",
    section: "basis",
    bases: ["spouse"],
    label: "Certification of Marriage form or Certification of Civil Partnership form (whichever applies)",
    hint: "ISD's form, completed and signed by the person who certified your certificate. For a civil partnership, use ISD's Certification of Civil Partnership form instead.",
    link: FORMS.marriageCertification,
  },
  {
    key: "spouse-citizenship",
    section: "basis",
    bases: ["spouse"],
    label: "Proof your spouse or partner is Irish",
    hint: "A certified copy of one of: their Irish passport photo page, Irish birth certificate, naturalisation certificate, or Foreign Births Register entry.",
  },
  {
    key: "spouse-declaration",
    section: "basis",
    bases: ["spouse"],
    optional: true,
    label: "Statutory declaration from your Irish spouse or partner: spousal or civil partner version (signed on lodging day)",
    hint: "Your spouse or partner swears this, with photo ID, in front of a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public (not a Garda). It must be dated on or after the day the application is lodged — JT Immigration will tell you when to get it signed. Use the civil partner version if that applies.",
    link: FORMS.spousalDeclaration,
  },
  {
    key: "shared-address-you",
    section: "basis",
    bases: ["spouse"],
    label: "3 proofs of your shared address — yours",
    hint: "Three different documents in your name showing your shared address, covering the 3 months before you apply (e.g. utility bill, bank statement, tenancy).",
  },
  {
    key: "shared-address-spouse",
    section: "basis",
    bases: ["spouse"],
    label: "3 proofs of your shared address — your spouse's",
    hint: "Three different documents in your spouse's or partner's name showing the same address, covering the same 3 months.",
  },
  {
    key: "status-letter",
    section: "basis",
    bases: ["refugee"],
    label: "Letter granting your refugee status or stateless status (whichever applies)",
    hint: "The letter from the Department of Justice confirming your status and the date it was granted. Your residence is counted from that date.",
  },
];

const OTHER: DocumentRequirement[] = [
  {
    key: "residence-affidavit",
    section: "residence",
    group: "Only if a year is short of 150 points",
    optional: true,
    label: "Residential Proof Affidavit",
    hint: "For exceptional cases only, explaining why you can't provide enough documents for a year. Sworn before a solicitor, Commissioner for Oaths, Peace Commissioner or Notary Public.",
    link: FORMS.residenceAffidavit,
  },
  {
    key: "translations",
    section: "other",
    optional: true,
    label: "Translations of non-English documents",
    hint: "For any document not in English or Irish: a translation by a professional translation service, with the translator's signature and contact details. Upload the original document in its own slot above. EU public documents with a Multilingual Standard Form don't need a translation.",
  },
  {
    key: "cover-note",
    section: "other",
    optional: true,
    label: "Cover note for special circumstances",
    hint: "A short signed note explaining anything unusual — e.g. your periods of residence (from–to dates and addresses) if your time in Ireland was broken up, bills not in your name, living in IPAS/State accommodation, gaps in permission, time abroad over 70 days.",
  },
  {
    key: "police-clearance",
    section: "other",
    optional: true,
    label: "Police clearance certificate",
    hint: "Only if you currently live outside the State (e.g. in Northern Ireland) — from the police force where you live.",
  },
  {
    key: "change-of-name",
    section: "other",
    optional: true,
    label: "Change of name documents",
    hint: "If your name is different on any of your documents — e.g. marriage certificate or deed poll.",
  },
];

export function getBasis(slug: string): Basis | undefined {
  return BASES.find((b) => b.slug === slug);
}

export function documentsFor(basis: Basis): DocumentRequirement[] {
  const all = [...IDENTITY, ...residenceYears(basis), ...IMMIGRATION, ...BASIS_DOCS, ...OTHER];
  return all.filter((d) => !d.bases || d.bases.includes(basis.slug));
}

export function documentTitle(doc: DocumentRequirement) {
  return doc.group && doc.section === "residence" ? `${doc.group.split(" — ")[0]}: ${doc.label}` : doc.label;
}

export function checklistStatus(basis: Basis, uploadedKeys: Iterable<string>) {
  const have = new Set(uploadedKeys);
  const required = documentsFor(basis).filter((d) => !d.optional);
  const missing = required.filter((d) => !have.has(d.key));
  return { done: required.length - missing.length, total: required.length, missing };
}

/** Rules for files uploaded to the ISD online form. */
export const ISD_FILE_RULES = { maxBytes: 5 * 1024 * 1024, types: ["application/pdf", "image/jpeg"] };

/** Preset reasons staff can pick when flagging a document (from ISD's common return reasons). */
export const ISSUE_REASONS = [
  "Not certified, or certification incomplete (needs signature, date, name and role of a solicitor / Commissioner for Oaths / Peace Commissioner / Notary — seen in person)",
  "Certification form missing or not completed by the same person who certified the copy",
  "Not full colour, blurry, cropped or hard to read — please rescan the whole page",
  "Wrong document for this slot",
  "Document is out of date / expired",
  "Wrong year — the date must fall within the year this slot covers",
  "Your name or Irish address isn't shown on the document",
  "Bank statement doesn't qualify — needs 3 consecutive months with 3+ in-person card payments a month in Ireland, from a CBI/ECB-regulated bank",
  "Employment Detail Summary must be in your own name",
  "Translation missing or not from a professional translator (needs signature and contact details)",
  "Pages missing — upload every page as one PDF",
  "Several documents merged into one file — upload one document per file",
  "Same document already used for another year",
] as const;

export type DocState = "missing" | "uploaded" | "approved" | "issue" | "reuploaded";

export const DOC_STATE_LABEL: Record<DocState, string> = {
  missing: "Not uploaded",
  uploaded: "Awaiting review",
  approved: "Approved",
  issue: "Needs attention",
  reuploaded: "Re-uploaded — awaiting review",
};

/** Combine uploads and the latest staff review into a status for one checklist item. */
export function docState(
  files: { uploadedAt: string }[],
  review: { status: "approved" | "issue"; at: string } | undefined,
): DocState {
  const newest = files.reduce((m, f) => (f.uploadedAt > m ? f.uploadedAt : m), "");
  if (review?.status === "issue") return newest > review.at ? "reuploaded" : "issue";
  if (files.length === 0) return "missing";
  if (!review) return "uploaded";
  return newest > review.at ? "reuploaded" : "approved";
}

export const SECTION_ORDER = (key: SectionKey) => SECTIONS.findIndex((s) => s.key === key);
