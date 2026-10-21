import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'Digitaler Anwalt – Ihr Recht. Unsere Expertise. Vollständig digital.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() { return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#142d40', color: '#f6f5f1', padding: '70px', width: '100%', height: '100%' }}><div style={{ fontSize: 24, letterSpacing: 6, color: '#b7a278' }}>DIGITALER ANWALT</div><div style={{ display: 'flex', flexDirection: 'column', fontSize: 74, letterSpacing: -3, lineHeight: 1.1 }}><span>Ihr Recht. Unsere Expertise.</span><span style={{ color: '#b7a278' }}>Vollständig digital.</span></div><div style={{ fontSize: 23, color: '#b4c0c5' }}>Strafrecht · Steuerrecht · IT-Recht · Online-Betrug</div></div>, size); }
