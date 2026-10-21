import { z } from 'zod';
import { practices, commonFaq } from './content';
const text = z.string().trim().min(1).max(10000);
const faq = z.array(z.tuple([text, text])).max(50);
export const contentSchema = z
  .object({
    heroLines: z.tuple([
      z.string().min(1).max(80),
      z.string().min(1).max(80),
      z.string().min(1).max(80),
    ]),
    heroIntro: text,
    faq,
    practices: z
      .array(
        z.object({
          slug: z.enum(['strafrecht', 'steuerrecht', 'it-recht', 'online-betrug']),
          title: z.string().min(1).max(80),
          icon: z.enum(['scale', 'file', 'code', 'shield']),
          tag: text,
          description: text,
          topics: z.array(text).min(1).max(8),
          lead: text,
          intro: text,
          problems: z.array(text).min(1).max(15),
          support: text,
          prepare: text,
          faq,
        }),
      )
      .length(4),
  })
  .refine(
    (c) => new Set(c.practices.map((p) => p.slug)).size === 4,
    'Alle vier Rechtsgebiete müssen genau einmal vorkommen.',
  );
export type SiteContent = z.infer<typeof contentSchema>;
export const defaultContent: SiteContent = {
  heroLines: ['Ihr Recht.', 'Unsere Expertise.', 'Vollständig digital.'],
  heroIntro:
    'Professionelle anwaltliche Beratung im Strafrecht, Steuerrecht, IT-Recht und bei Online-Betrug – ortsunabhängig, persönlich und sicher.',
  faq: commonFaq.map(([q, a]) => [q, a]),
  practices: practices.map((p) => ({
    ...p,
    topics: [...p.topics],
    problems: [...p.problems],
    faq: p.faq.map(([q, a]) => [q, a]),
  })),
};
