'use client'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-8">
      <div className="rounded-xl bg-red-950 border border-red-800 px-6 py-5 max-w-lg w-full text-left">
        <p className="text-sm font-semibold text-red-400 mb-2">Error en /platform</p>
        <p className="text-sm text-red-200 font-mono break-all">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-red-500 mt-2">digest: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="text-sm text-zinc-400 hover:text-zinc-200 underline"
      >
        Reintentar
      </button>
    </div>
  )
}
