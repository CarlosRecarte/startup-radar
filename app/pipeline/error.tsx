'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[Pipeline error]', error);
  }, [error]);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">Error al cargar el pipeline</h2>
      <p className="text-sm text-zinc-400 mb-1 max-w-sm">
        No se pudo conectar con Supabase. Comprueba tu conexión y las credenciales en{' '}
        <code className="text-violet-400">.env.local</code>.
      </p>
      {error.digest && (
        <p className="text-xs text-zinc-600 mb-4">Referencia: {error.digest}</p>
      )}
      <button
        onClick={() => unstable_retry()}
        className="mt-4 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
