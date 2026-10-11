// Client questionnaire mirroring the ISD online naturalisation form (Form 8, S.I. 498/2023),
// plus the extra facts JT Immigration needs to check eligibility and prepare Garda e-vetting.
// `form8` holds the question number on the ISD form so staff can transcribe answers in order.

import type { BasisSlug } from "./citizenship";

export type FieldType = "text" | "date" | "email" | "tel" | "textarea" | "select" | "yesno" | "number";

export type Condition = { field: string; equals: string | string[] };

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  form8?: string;
  help?: string;
  options?: string[];
  required?: boolean;
  showIf?: Condition;
  placeholder?: string;
  /** Only asked for these application types (default: all). */
  bases?: BasisSlug[];
};

export type ListField = {
  id: string;
  type: "list";
  label: string;
  form8?: string;
  help?: string;
  fields: Field[];
  showIf?: Condition;
  bases?: BasisSlug[];
  /** At least this many rows should be filled when shown. */
  minRows?: number;
  addLabel?: string;
};

export type Question = Field | ListField;

export type Section = {
  id: string;
  title: string;
  intro?: string;
  bases?: BasisSlug[];
  questions: Question[];
};

const YES = "Yes";

export const SECTIONS: Section[] = [
  {
    id: "personal",
    title: "Personal details",
    intro: "Exactly as they appear on your passport and birth certificate.",
    questions: [
      { id: "firstNames", label: "Current first name(s)", type: "text", form8: "1.1", required: true },
      { id: "lastName", label: "Current family name / surname", type: "text", form8: "1.2", required: true },
      { id: "nameAtBirth", label: "Full name at birth (if different)", type: "text", help: "Needed for Garda vetting." },
      { id: "previousNames", label: "Any other or previous names you have used", type: "text", form8: "1.3", placeholder: "Leave blank if none" },
      { id: "nameChangeReason", label: "Reason for the name change", type: "text", form8: "1.4", placeholder: "e.g. marriage, deed poll", showIf: { field: "previousNames", equals: "__filled" } },
      { id: "nameChangeDate", label: "Date you changed to your present name", type: "date", form8: "1.5", showIf: { field: "previousNames", equals: "__filled" } },
      { id: "gender", label: "Gender", type: "select", form8: "2.4", options: ["Female", "Male", "Other"], required: true },
      { id: "dateOfBirth", label: "Date of birth", type: "date", form8: "2.3", required: true },
      { id: "placeOfBirth", label: "Place (town/city) of birth, as on your birth certificate", type: "text", form8: "2.1", required: true },
      { id: "countryOfBirth", label: "Country of birth", type: "text", form8: "2.2", required: true },
      { id: "nationality", label: "Present nationality (or nationalities)", type: "text", form8: "2.5", required: true },
      { id: "nationalityAcquired", label: "Date you got this nationality (if not from birth)", type: "date", help: "EU/EEA, UK and Swiss nationals must have held that nationality for 5+ years to skip the residence-permission rules." },
      { id: "mothersMaidenName", label: "Mother's maiden name", type: "text", help: "Optional — Garda vetting may ask for it later." },
    ],
  },
  {
    id: "identification",
    title: "ID numbers",
    questions: [
      { id: "passportNumber", label: "Passport / travel document number", type: "text", form8: "2.6", required: true },
      { id: "passportCountry", label: "Issuing country", type: "text", form8: "2.7", required: true },
      { id: "passportExpiry", label: "Expiry date", type: "date", form8: "2.8", required: true },
      { id: "ppsNumber", label: "PPS number", type: "text", form8: "2.9", placeholder: "e.g. 1234567AB" },
      { id: "irpNumber", label: "IRP / GNIB card number", type: "text", form8: "2.10", help: "Not needed for EU/EEA, UK or Swiss citizens." },
      { id: "irpExpiry", label: "Current IRP card expiry date", type: "date", help: "Your IRP must stay in date until your citizenship ceremony." },
      { id: "personId", label: "Person ID number (on letters from Immigration Service Delivery)", type: "text", form8: "2.11" },
      { id: "oldDeptRef", label: "Old Department of Justice reference number (if any)", type: "text", form8: "2.12" },
      { id: "arrivalDate", label: "Date you first arrived in Ireland to live", type: "date", form8: "2.13", required: true },
    ],
  },
  {
    id: "contact",
    title: "Address & contact",
    intro: "Immigration Service Delivery sends acknowledgements, vetting forms and the ceremony invitation to this email.",
    questions: [
      { id: "address", label: "Current address in Ireland", type: "textarea", form8: "3.1", required: true },
      { id: "eircode", label: "Eircode", type: "text", form8: "3.1", required: true },
      { id: "email", label: "Email address", type: "email", form8: "3.2", required: true },
      { id: "phone", label: "Phone number", type: "tel", form8: "3.3", required: true },
      {
        id: "addressHistory",
        type: "list",
        label: "Every address you have lived at since birth (most recent first)",
        help: "Garda vetting asks for every address since birth, in Ireland and abroad. Give Eircodes for Irish addresses and the full postcode for Northern Ireland.",
        minRows: 1,
        addLabel: "Add address",
        fields: [
          { id: "from", label: "From", type: "date" },
          { id: "to", label: "To", type: "date" },
          { id: "address", label: "Full address", type: "text" },
          { id: "postcode", label: "Eircode / postcode", type: "text" },
          { id: "country", label: "Country", type: "text" },
        ],
      },
    ],
  },
  {
    id: "residence",
    title: "Residence & travel",
    intro: "This is how we check your reckonable residence before anything is filed.",
    questions: [
      {
        id: "permissions",
        type: "list",
        label: "Your Irish immigration permissions (stamps), oldest first",
        help: "Every stamp you have held, with exact dates from your IRP/GNIB cards and letters. Leave a gap in the dates only if there really was a gap. EU/EEA, UK and Swiss citizens can skip this.",
        addLabel: "Add permission",
        fields: [
          { id: "stamp", label: "Stamp", type: "select", options: ["Stamp 0", "Stamp 1", "Stamp 1G", "Stamp 2", "Stamp 2A", "Stamp 3", "Stamp 4", "Stamp 4 EU FAM", "Stamp 5", "Stamp 6", "Other"] },
          { id: "from", label: "From", type: "date" },
          { id: "to", label: "To", type: "date" },
          { id: "card", label: "IRP/GNIB card no.", type: "text" },
        ],
      },
      { id: "calculatorDone", bases: ["standard", "spouse"], label: "Have you entered your stamps into the ISD naturalisation residency calculator and does it say you qualify?", type: "select", form8: "4.1", options: ["Yes", "No", "Not sure", "Not applicable (EU/EEA/UK/Swiss)"], required: true, help: "Calculator: irishimmigration.ie/naturalisation-residency-calculator" },
      { id: "dependentYoungAdult", label: "Are you aged 18–23 and dependent on your parents for accommodation and living costs?", type: "yesno", form8: "4.2", required: true },
      { id: "studied", label: "Were you in Ireland to study at any time in the last 9 years?", type: "yesno", form8: "4.3", required: true },
      {
        id: "studyPeriods",
        type: "list",
        label: "Study periods",
        form8: "4.3",
        showIf: { field: "studied", equals: YES },
        minRows: 1,
        fields: [
          { id: "from", label: "From", type: "date" },
          { id: "to", label: "To", type: "date" },
          { id: "school", label: "Name & address of school/college", type: "text" },
        ],
      },
      { id: "protectionApplicant", label: "Were you an international protection applicant (asylum seeker) in Ireland at any time in the last 9 years?", type: "yesno", form8: "4.4", required: true },
      {
        id: "protectionPeriods",
        type: "list",
        label: "International protection periods",
        form8: "4.4",
        showIf: { field: "protectionApplicant", equals: YES },
        minRows: 1,
        fields: [
          { id: "from", label: "From", type: "date" },
          { id: "to", label: "To", type: "date" },
          { id: "outcome", label: "Outcome", type: "text" },
          { id: "ref", label: "Reference number", type: "text" },
        ],
      },
      {
        id: "trips",
        type: "list",
        label: "Every trip outside Ireland in the last 5 years",
        form8: "4.5",
        help: "Include holidays, work trips and trips to Northern Ireland or the UK. We count the days for you (the day you leave and the day you return don't count). More than 70 days in the last 12 months needs a reason; more than 100 means you can't apply yet.",
        addLabel: "Add trip",
        fields: [
          { id: "left", label: "Left Ireland", type: "date" },
          { id: "returned", label: "Returned", type: "date" },
          { id: "country", label: "Country", type: "text" },
          { id: "reason", label: "Reason", type: "text" },
        ],
      },
      { id: "noTrips", label: "I haven't left Ireland in the last 5 years", type: "select", options: ["", "Confirmed — no trips"] },
      { id: "over70Reasons", label: "If you were away more than 70 days in any year, explain why", type: "textarea", form8: "4.5" },
    ],
  },
  {
    id: "intentions",
    title: "Future residence & status",
    questions: [
      { id: "intendResideState", bases: ["standard", "refugee"], label: "After naturalisation, do you intend to keep living in Ireland?", type: "yesno", form8: "5.1", required: true },
      { id: "intendResideIsland", bases: ["spouse"], label: "After naturalisation, do you intend to keep living on the island of Ireland?", type: "yesno", form8: "5.2", required: true },
      { id: "intendedCountry", label: "If no, which country do you intend to live in?", type: "text", form8: "5.3" },
      { id: "maritalStatus", label: "Current status", type: "select", form8: "6.1 / 1.6", options: ["Single", "Married", "Separated", "Divorced", "Widow / Widower", "Civil partner", "Surviving civil partner"], required: true },
      { id: "widowOfIrish", label: "Are you the widow, widower or surviving civil partner of someone who was an Irish citizen when they died?", type: "yesno", form8: "6.2", required: true },
      { id: "widowNewNationality", label: "Since their death, have you acquired another nationality?", type: "yesno", form8: "6.3", showIf: { field: "widowOfIrish", equals: YES } },
      { id: "widowRemarried", label: "Since their death, have you married or entered a civil partnership with someone else?", type: "yesno", form8: "6.4", showIf: { field: "widowOfIrish", equals: YES } },
      { id: "appliedBefore", label: "Have you applied for Irish citizenship before?", type: "yesno", form8: "7.1", required: true },
      { id: "previousApplicationDate", label: "Date of previous application", type: "date", form8: "7.2", showIf: { field: "appliedBefore", equals: YES } },
      { id: "previousApplicationRef", label: "Previous application reference number", type: "text", form8: "7.3", showIf: { field: "appliedBefore", equals: YES }, placeholder: "e.g. 1234567-CITZ-10" },
      { id: "otherRefusals", label: "Any Irish visa, permission or citizenship refusals, deportation orders or removals? Give details", type: "textarea" },
    ],
  },
  {
    id: "background",
    title: "Background (good character)",
    intro: "Answer honestly — Garda vetting checks everything, including spent convictions, traffic offences and offences abroad, however old. Not disclosing something is treated far more seriously than the offence itself.",
    questions: [
      { id: "q8_1", label: "Have you ever committed any offence against the laws of Ireland or any other country?", type: "yesno", form8: "8.1", required: true },
      { id: "q8_2", label: "Have you ever defrauded any person, company or State agency?", type: "yesno", form8: "8.2", required: true },
      { id: "q8_3", label: "Do you have any convictions (including traffic offences / penalty points that went to court) or civil judgments, in Ireland or abroad?", type: "yesno", form8: "8.3", required: true },
      {
        id: "convictions",
        type: "list",
        label: "Convictions and judgments",
        form8: "8.4–8.6",
        showIf: { field: "q8_3", equals: YES },
        minRows: 1,
        fields: [
          { id: "date", label: "Date", type: "date" },
          { id: "place", label: "Court / place", type: "text" },
          { id: "offence", label: "Offence", type: "text" },
          { id: "outcome", label: "Outcome (fine, points, etc.)", type: "text" },
        ],
      },
      { id: "q8_7", label: "Have you ever been charged with an offence that hasn't been tried yet?", type: "yesno", form8: "8.7", required: true },
      { id: "q8_8", label: "Are you, or have you ever been, the subject of a Garda investigation?", type: "yesno", form8: "8.8", required: true },
      { id: "q8_9", label: "Have you ever been involved in, or suspected of, war crimes, crimes against humanity or genocide?", type: "yesno", form8: "8.9", required: true },
      { id: "q8_10", label: "Have you ever been associated with, a member of, or a supporter of a terrorist organisation?", type: "yesno", form8: "8.10", required: true },
      { id: "q8_11", label: "Have you ever expressed views that justify or glorify terrorist violence or encourage serious crime?", type: "yesno", form8: "8.11", required: true },
      { id: "q8_12", label: "Have you engaged in any other activities that might indicate you are not of good character?", type: "yesno", form8: "8.12", required: true },
      { id: "backgroundDetails", label: "Details for any 'Yes' answer above", type: "textarea", form8: "8 (additional details)" },
    ],
  },
  {
    id: "spouse",
    title: "Your marriage / civil partnership",
    bases: ["spouse"],
    intro: "Your Irish spouse or partner's details are also needed for their statutory declaration.",
    questions: [
      { id: "relationshipType", label: "Application is based on", type: "select", form8: "10.1 / 10.2", options: ["Marriage to an Irish citizen", "Civil partnership with an Irish citizen"], required: true },
      { id: "marriageDate", label: "Date of marriage / registration of civil partnership", type: "date", form8: "10.3", required: true },
      { id: "marriagePlace", label: "Place of marriage / civil partnership", type: "text", form8: "10.4", required: true },
      { id: "marriageCountry", label: "Country", type: "text", form8: "10.4", required: true },
      { id: "spouseHowIrish", label: "How is your spouse/partner an Irish citizen?", type: "select", form8: "10.5", options: ["Birth", "Descent (Foreign Births Register)", "Naturalisation", "Post-nuptial declaration", "Honorary"], required: true },
      { id: "spouseFullName", label: "Spouse/partner's full name", type: "text", required: true },
      { id: "spouseNameAtBirth", label: "Spouse/partner's name at birth", type: "text" },
      { id: "spouseDob", label: "Spouse/partner's date of birth", type: "date", required: true },
      { id: "spousePlaceOfBirth", label: "Spouse/partner's place of birth", type: "text", required: true },
      { id: "spousePassport", label: "Spouse/partner's Irish passport number", type: "text" },
      { id: "spousePhone", label: "Spouse/partner's phone", type: "tel" },
      { id: "livingTogetherSince", label: "Living together at the same address since", type: "date", required: true },
    ],
  },
  {
    id: "refugee",
    title: "Your status",
    bases: ["refugee"],
    questions: [
      { id: "statusType", label: "Status", type: "select", options: ["Refugee (Convention refugee)", "Programme refugee", "Stateless person", "Subsidiary protection", "Permission to remain"], required: true, help: "Subsidiary protection and permission to remain are not 'refugee' status for this route — we'll check the right basis for you." },
      { id: "statusGranted", label: "Date your status was granted", type: "date", required: true },
      { id: "statusRef", label: "Reference number on the grant letter", type: "text" },
      { id: "travelDocNumber", label: "Irish travel document number", type: "text" },
    ],
  },
  {
    id: "employment",
    title: "Work & income",
    intro: "Helps us choose the right proof of residence for each year (e.g. Revenue Employment Detail Summaries).",
    questions: [
      {
        id: "employment",
        type: "list",
        label: "Employment, self-employment, study or other activity for each year you're counting",
        addLabel: "Add entry",
        fields: [
          { id: "from", label: "From", type: "date" },
          { id: "to", label: "To", type: "date" },
          { id: "employer", label: "Employer / activity", type: "text" },
          { id: "role", label: "Role", type: "text" },
        ],
      },
    ],
  },
  {
    id: "referees",
    title: "Referees",
    intro: "Three Irish citizens who know you (name and phone number). They don't sign anything.",
    questions: [
      { id: "ref1Name", label: "Referee 1 — name", type: "text", form8: "11.1", required: true },
      { id: "ref1Phone", label: "Referee 1 — phone", type: "tel", form8: "11.1", required: true },
      { id: "ref2Name", label: "Referee 2 — name", type: "text", form8: "11.1", required: true },
      { id: "ref2Phone", label: "Referee 2 — phone", type: "tel", form8: "11.1", required: true },
      { id: "ref3Name", label: "Referee 3 — name", type: "text", form8: "11.1", required: true },
      { id: "ref3Phone", label: "Referee 3 — phone", type: "tel", form8: "11.1", required: true },
      { id: "anythingElse", label: "Anything else we should know?", type: "textarea" },
    ],
  },
];

/** The sections and questions asked for this application type. */
export function sectionsFor(basis: string): Section[] {
  const applies = (x: { bases?: BasisSlug[] }) => !x.bases || x.bases.includes(basis as BasisSlug);
  return SECTIONS.filter(applies).map((s) => ({ ...s, questions: s.questions.filter(applies) }));
}

export function getSection(id: string) {
  return SECTIONS.find((s) => s.id === id);
}

type AnswerValue = string | Record<string, string>[] | undefined;

export function isShown(q: Question, answers: Record<string, AnswerValue>) {
  if (!q.showIf) return true;
  const v = answers[q.showIf.field];
  if (q.showIf.equals === "__filled") return typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0;
  const want = Array.isArray(q.showIf.equals) ? q.showIf.equals : [q.showIf.equals];
  return typeof v === "string" && want.includes(v);
}

const filledRow = (r: Record<string, string>) => Object.values(r).some((v) => v?.trim());

/** Which required questions in a section are still unanswered. */
export function missingInSection(section: Section, answers: Record<string, AnswerValue>): Question[] {
  return section.questions.filter((q) => {
    if (!isShown(q, answers)) return false;
    const v = answers[q.id];
    if (q.type === "list") {
      const rows = Array.isArray(v) ? v.filter(filledRow) : [];
      if (q.id === "trips") return rows.length === 0 && answers.noTrips !== "Confirmed — no trips";
      if (q.id === "permissions") return rows.length === 0 && !String(answers.calculatorDone ?? "").startsWith("Not applicable");
      return rows.length < (q.minRows ?? 0);
    }
    return q.required && (typeof v !== "string" || v.trim() === "");
  });
}

export function questionnaireProgress(basis: string, answers: Record<string, AnswerValue>) {
  const sections = sectionsFor(basis).map((s) => ({ section: s, missing: missingInSection(s, answers) }));
  return { sections, complete: sections.filter((s) => s.missing.length === 0).length, total: sections.length };
}

/** Sanitise answers submitted for one section: only known question ids, trimmed, length-capped. */
export function cleanSectionAnswers(section: Section, input: Record<string, unknown>) {
  const out: Record<string, string | Record<string, string>[]> = {};
  for (const q of section.questions) {
    const v = input[q.id];
    if (q.type === "list") {
      const rows = Array.isArray(v) ? v.slice(0, 100) : [];
      out[q.id] = rows
        .map((row) => {
          const r: Record<string, string> = {};
          for (const f of q.fields) r[f.id] = String((row as Record<string, unknown>)?.[f.id] ?? "").trim().slice(0, 500);
          return r;
        })
        .filter(filledRow);
    } else {
      out[q.id] = String(v ?? "").trim().slice(0, q.type === "textarea" ? 4000 : 300);
    }
  }
  return out;
}

// ---- Absence calculation (70 / 100 day rule) ----

const DAY = 86_400_000;

/** Days abroad between `from` and `to`, excluding the day of departure and the day of return. */
export function absenceDays(trips: Record<string, string>[], from: Date, to: Date) {
  let total = 0;
  for (const t of trips) {
    const left = Date.parse(t.left);
    const back = Date.parse(t.returned || "") || to.getTime();
    if (!left || back <= left) continue;
    const start = Math.max(left + DAY, from.getTime());
    const end = Math.min(back - DAY, to.getTime());
    if (end >= start) total += Math.floor((end - start) / DAY) + 1;
  }
  return total;
}

/** Days abroad in each of the last 5 years counted back from `asOf` (year 1 = most recent 12 months). */
export function absenceByYear(trips: Record<string, string>[], asOf = new Date()) {
  return Array.from({ length: 5 }, (_, i) => {
    const to = new Date(asOf.getTime() - i * 365 * DAY);
    const from = new Date(to.getTime() - 365 * DAY + DAY);
    return { year: i + 1, from, to, days: absenceDays(trips, from, to) };
  });
}

/** Find gaps between consecutive permissions (any gap breaks reckonable residence). */
export function permissionGaps(perms: Record<string, string>[]) {
  const sorted = perms
    .filter((p) => p.from && p.to)
    .sort((a, b) => a.from.localeCompare(b.from));
  const gaps: { after: string; before: string; days: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = Date.parse(sorted[i - 1].to);
    const nextStart = Date.parse(sorted[i].from);
    const days = Math.round((nextStart - prevEnd) / DAY) - 1;
    if (days > 0) gaps.push({ after: sorted[i - 1].to, before: sorted[i].from, days });
  }
  return gaps;
}
