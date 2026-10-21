'use client';
import { post } from '@/lib/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function MarkRead() {
  const router = useRouter();
  const [error, setError] = useState('');
  return (
    <>
      <button
        className="small-button"
        onClick={async () => {
          try {
            await post('notifications/read', {});
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Alle als gelesen markieren
      </button>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
    </>
  );
}
