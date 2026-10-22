import Image from 'next/image';
import { BRAND } from '@/lib/branding';
export default function Loading() {
  return (
    <div className="loading" role="status">
      <Image
        src={BRAND.assets.signetDark}
        width={48}
        height={50}
        alt=""
        className="loading-signet"
      />
      <span />
      <p>Seite wird geladen …</p>
    </div>
  );
}
