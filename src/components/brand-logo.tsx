import Image from 'next/image';
import { BRAND } from '@/lib/branding';
export function BrandLogo({
  light = false,
  preload = false,
}: {
  light?: boolean;
  preload?: boolean;
}) {
  return (
    <Image
      className="brand-logo"
      src={light ? BRAND.assets.logoLight : BRAND.assets.logoDark}
      alt={BRAND.name}
      width={744}
      height={light ? 691 : 695}
      sizes={light ? '(max-width: 640px) 140px, 158px' : '(max-width: 640px) 86px, 110px'}
      preload={preload}
    />
  );
}
