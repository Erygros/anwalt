import { z } from 'zod';
export const uuid = z.string().uuid();
export const practiceSchema = z.enum([
  'strafrecht',
  'steuerrecht',
  'it-recht',
  'online-betrug',
  'unklar',
]);
export const intakeSchema = z.object({
  id: uuid.optional(),
  practice: practiceSchema,
  subject: z.string().trim().min(5).max(180),
  urgency: z.enum(['normal', 'zeitnah', 'dringend']),
  facts: z.string().trim().min(30).max(20000),
  deadline: z.iso.date().nullable(),
  opponent: z.string().trim().min(2).max(1500),
  fullName: z.string().trim().min(3).max(150),
  phone: z.string().trim().max(50),
  company: z.string().trim().max(180),
  acknowledged: z.literal(true),
});
export const messageSchema = z.object({
  caseId: uuid,
  body: z.string().trim().min(1).max(10000),
  internal: z.boolean().default(false),
});
export const bookingSchema = z.object({
  slotId: uuid,
  mode: z.enum(['phone', 'video']),
  caseId: uuid.nullable().default(null),
  replaceId: uuid.nullable().default(null),
});
export const profileSchema = z.object({
  full_name: z.string().trim().min(3).max(150),
  phone: z.string().max(50),
  company: z.string().max(180),
  address: z.string().max(700),
});
export const firmSchema = z.object({
  brand: z.string().min(1).max(80),
  legalName: z.string().max(250),
  address: z.string().max(600),
  email: z.union([z.email(), z.literal('')]),
  phone: z.string().max(80),
  register: z.string().max(600),
  vatId: z.string().max(100),
  chamber: z.string().max(1000),
  professionalTitle: z.string().max(300),
  countryOfAdmission: z.string().max(200),
  insurance: z.string().max(1500),
  insuranceTerritory: z.string().max(700),
  responsible: z.string().max(400),
  privacyText: z.string().max(60000),
  imprintText: z.string().max(30000),
  feeText: z.string().max(10000),
  mandateTerms: z.string().max(60000),
  cancellationText: z.string().max(30000),
  privacyReviewedAt: z.string().max(50),
  legalReviewedAt: z.string().max(50),
  about: z.string().max(10000),
  lawyers: z
    .array(
      z.object({
        name: z.string().min(3).max(150),
        title: z.string().min(2).max(200),
        bio: z.string().max(5000),
      }),
    )
    .max(50),
  services: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(100),
        title: z.string().min(3).max(180),
        description: z.string().min(10).max(3000),
        amount: z.number().int().min(1).max(10000000),
        taxRate: z.number().min(0).max(100),
      }),
    )
    .max(50),
});
export const statusLabels: Record<string, string> = {
  draft: 'Entwurf',
  submitted: 'Anfrage eingegangen',
  conflict_review: 'In Prüfung',
  accepted: 'Mandat angenommen',
  declined: 'Nicht übernommen',
  closed: 'Abgeschlossen',
  booked: 'Bestätigt',
  cancelled: 'Storniert',
  completed: 'Durchgeführt',
  open: 'Offen',
  paid: 'Bezahlt',
  void: 'Aufgehoben',
};
