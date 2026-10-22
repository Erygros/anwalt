// Verified information only. Admin-managed published configuration overrides these defaults.
import { BRAND } from './branding';
export const defaultFirm = {
  brand: BRAND.name as string,
  legalName: '',
  address: '',
  email: '',
  phone: '',
  register: '',
  vatId: '',
  chamber: '',
  professionalTitle: '',
  countryOfAdmission: '',
  insurance: '',
  insuranceTerritory: '',
  responsible: '',
  privacyText: '',
  imprintText: '',
  feeText: '',
  mandateTerms: '',
  cancellationText: '',
  privacyReviewedAt: '',
  legalReviewedAt: '',
  about: '',
  lawyers: [] as { name: string; title: string; bio: string }[],
  services: [] as {
    id: string;
    title: string;
    description: string;
    amount: number;
    taxRate: number;
  }[],
};
export type Firm = typeof defaultFirm;
export function isFirmComplete(f: Firm) {
  return !!(
    f.legalName &&
    f.address &&
    f.email &&
    f.chamber &&
    f.professionalTitle &&
    f.countryOfAdmission &&
    f.insurance &&
    f.insuranceTerritory &&
    f.responsible &&
    f.privacyText &&
    f.imprintText &&
    f.mandateTerms &&
    f.privacyReviewedAt &&
    f.legalReviewedAt &&
    f.lawyers.length > 0
  );
}
