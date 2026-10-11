// Work permit categories — not offered on the site right now (citizenship only).
// Kept so they can be re-enabled later; nothing imports this file.

export type DocumentRequirement = {
  key: string;
  label: string;
  hint: string;
  optional?: boolean;
};

export type VisaCategory = {
  slug: string;
  name: string;
  short: string;
  summary: string;
  eligibility: string[];
  documents: DocumentRequirement[];
};

const passport: DocumentRequirement = {
  key: "passport",
  label: "Passport",
  hint: "Clear scan of every page of your current passport, valid for at least 12 months.",
};

const photo: DocumentRequirement = {
  key: "photo",
  label: "Passport photograph",
  hint: "Recent colour photo, white background, taken within the last 6 months.",
};

const cv: DocumentRequirement = {
  key: "cv",
  label: "Curriculum vitae (CV)",
  hint: "Up-to-date CV showing your full employment history and education.",
};

const qualifications: DocumentRequirement = {
  key: "qualifications",
  label: "Degree certificates & transcripts",
  hint: "Certificates and transcripts for your highest qualifications.",
};

const contract: DocumentRequirement = {
  key: "contract",
  label: "Signed job offer / employment contract",
  hint: "Signed by you and the Irish employer, showing role, salary, hours and duration.",
};

const employerRegistration: DocumentRequirement = {
  key: "employer-registration",
  label: "Employer registration details",
  hint: "Employer's CRO number and Revenue registration (your employer can provide this).",
};

const previousPermits: DocumentRequirement = {
  key: "previous-permits",
  label: "Previous Irish permits / IRP card",
  hint: "Copies of any previous Irish employment permits or IRP cards.",
  optional: true,
};

export const CATEGORIES: VisaCategory[] = [
  {
    slug: "critical-skills",
    name: "Critical Skills Employment Permit",
    short: "Critical Skills",
    summary:
      "For highly skilled roles on the Critical Skills Occupations List, or any eligible role paying €64,000+. Fast track to Stamp 4 residency.",
    eligibility: [
      "Job offer of at least 2 years",
      "Salary €38,000+ with a relevant degree (listed occupation), or €64,000+",
    ],
    documents: [
      passport,
      photo,
      cv,
      qualifications,
      contract,
      employerRegistration,
      {
        key: "professional-registration",
        label: "Professional registration",
        hint: "Registration with the relevant Irish body (e.g. Engineers Ireland, NMBI), if your profession requires it.",
        optional: true,
      },
      previousPermits,
    ],
  },
  {
    slug: "general-employment",
    name: "General Employment Permit",
    short: "General Employment",
    summary:
      "For roles not on the ineligible occupations list, where the employer has shown no suitable EEA candidate is available.",
    eligibility: ["Salary €34,000+ (some exceptions apply)", "Labour Market Needs Test completed by employer"],
    documents: [
      passport,
      photo,
      cv,
      qualifications,
      contract,
      employerRegistration,
      {
        key: "labour-market-test",
        label: "Labour Market Needs Test evidence",
        hint: "Copies of the job adverts (Jobs Ireland/EURES for 28 days plus national press and online), from your employer.",
      },
      {
        key: "fifty-fifty",
        label: "Employer 50:50 rule evidence",
        hint: "Confirmation that at least 50% of the employer's workforce are EEA nationals.",
      },
      previousPermits,
    ],
  },
  {
    slug: "intra-company-transfer",
    name: "Intra-Company Transfer Permit",
    short: "Intra-Company Transfer",
    summary:
      "For senior managers, key personnel and trainees moving from an overseas company to its Irish branch or affiliate.",
    eligibility: ["Employed by the overseas company for 6+ months", "Salary €46,000+ (key personnel)"],
    documents: [
      passport,
      photo,
      cv,
      {
        key: "assignment-letter",
        label: "Assignment / secondment letter",
        hint: "Letter from the overseas employer setting out the transfer, role, duration and salary.",
      },
      {
        key: "overseas-employment",
        label: "Proof of overseas employment",
        hint: "Last 6 months of payslips or an employer letter confirming your start date.",
      },
      {
        key: "company-link",
        label: "Evidence of company relationship",
        hint: "Documents showing the link between the overseas company and the Irish entity.",
      },
      employerRegistration,
      previousPermits,
    ],
  },
  {
    slug: "contract-for-services",
    name: "Contract for Services Permit",
    short: "Contract for Services",
    summary:
      "For workers employed by a foreign company that has a contract to provide services to an Irish company.",
    eligibility: ["Contract between foreign employer and Irish client", "Salary €34,000+"],
    documents: [
      passport,
      photo,
      cv,
      qualifications,
      {
        key: "services-contract",
        label: "Contract for services",
        hint: "The contract between your foreign employer and the Irish contractee.",
      },
      {
        key: "employment-proof",
        label: "Proof of employment with foreign employer",
        hint: "Contract of employment or employer letter, plus recent payslips.",
      },
      employerRegistration,
      previousPermits,
    ],
  },
  {
    slug: "employment-visa",
    name: "Employment (D) Visa",
    short: "Employment Visa",
    summary:
      "Entry visa for visa-required nationals who already hold an Irish employment permit and need to travel to Ireland.",
    eligibility: ["Employment permit already granted", "Nationality requires an entry visa for Ireland"],
    documents: [
      passport,
      {
        key: "previous-passports",
        label: "Previous passports",
        hint: "Copies of any previous passports showing travel history.",
        optional: true,
      },
      photo,
      {
        key: "employment-permit",
        label: "Employment permit",
        hint: "Copy of your granted Irish employment permit.",
      },
      {
        key: "avats-summary",
        label: "Signed AVATS summary sheet",
        hint: "The summary page from your online visa application, signed and dated.",
      },
      {
        key: "cover-letter",
        label: "Letter of application",
        hint: "Signed letter explaining why you are travelling and confirming you will comply with visa conditions.",
      },
      qualifications,
      {
        key: "bank-statements",
        label: "Bank statements (6 months)",
        hint: "Recent statements showing sufficient funds to support yourself on arrival.",
      },
      {
        key: "accommodation",
        label: "Proof of accommodation in Ireland",
        hint: "Rental agreement, booking confirmation or a letter from your host.",
      },
      {
        key: "medical-insurance",
        label: "Private medical insurance",
        hint: "Policy certificate covering you in Ireland.",
      },
    ],
  },
  {
    slug: "working-holiday",
    name: "Working Holiday Authorisation",
    short: "Working Holiday",
    summary:
      "Live and work in Ireland for up to 12 months. Open to citizens of partner countries (e.g. Australia, Canada, NZ, Japan) aged 18–30/35.",
    eligibility: ["Citizen of a participating country", "Age limit set by your country's agreement"],
    documents: [
      passport,
      photo,
      cv,
      {
        key: "proof-of-funds",
        label: "Proof of funds",
        hint: "Bank statement showing at least €4,000 (or as required by your country's scheme).",
      },
      {
        key: "travel-insurance",
        label: "Travel & medical insurance",
        hint: "Comprehensive cover for the full duration of your stay.",
      },
      {
        key: "police-certificate",
        label: "Police clearance certificate",
        hint: "Issued within the last 6 months by your home country.",
      },
      {
        key: "return-ticket",
        label: "Return ticket or funds for one",
        hint: "Onward/return booking, or evidence of funds to purchase one.",
        optional: true,
      },
    ],
  },
  {
    slug: "citizenship",
    name: "Irish Citizenship (Naturalisation)",
    short: "Citizenship",
    summary:
      "Become an Irish citizen after building up enough reckonable residence in Ireland — 5 years, or 3 if married to or in a civil partnership with an Irish citizen.",
    eligibility: [
      "5 years' reckonable residence in the last 9, including 1 year continuous before applying",
      "Aged 18+, of good character, and intending to keep living in Ireland",
    ],
    documents: [
      {
        ...passport,
        hint: "Certified copy of every page of your current passport, including blank pages.",
      },
      photo,
      {
        key: "birth-certificate",
        label: "Birth certificate",
        hint: "Full birth certificate, with a certified English translation if not in English.",
      },
      {
        key: "irp-cards",
        label: "All IRP / GNIB cards",
        hint: "Front and back of every Irish Residence Permit (or GNIB) card you have held.",
      },
      {
        key: "residence-proof",
        label: "Proof of residence for each year",
        hint: "Revenue Employment Detail Summaries (or P60s) for every year you are counting, plus supporting bank statements or utility bills.",
      },
      {
        key: "proof-of-address",
        label: "Current proof of address",
        hint: "Two recent documents (e.g. bank statement, utility bill) showing your current Irish address.",
      },
      {
        key: "marriage-certificate",
        label: "Marriage / civil partnership certificate",
        hint: "Required only if applying on the basis of marriage or civil partnership to an Irish citizen, with your spouse's Irish passport.",
        optional: true,
      },
      {
        key: "police-certificates",
        label: "Police certificates",
        hint: "From any country you lived in for 6+ months since age 18, if requested.",
        optional: true,
      },
    ],
  },
];

export function getCategory(slug: string): VisaCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
