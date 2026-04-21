'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadTenantLogo, removeTenantLogo } from '@/app/actions/platform'

const ACCEPTED = '.svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp'
const MAX_KB   = 1024  // 1 MB

interface LogoUploadProps {
  tenantId:   string
  currentUrl: string | null
}

export function LogoUpload({ tenantId, currentUrl }: LogoUploadProps) {
  const router          = useRouter()
  const inputRef        = useRef<HTMLInputElement>(null)
  const [preview,   setPreview]   = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [removing,  setRemoving]  = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview before upload
    setPreview(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('logo', file)

    setUploading(true)
    const result = await uploadTenantLogo(tenantId, formData)
    setUploading(false)

    if (!result.success) {
      toast.error('Error al subir el logo', { description: result.error })
      setPreview(currentUrl)
      return
    }

    setPreview(result.url ?? null)
    toast.success('Logo actualizado')
    router.refresh()
    // Reset input so el mismo archivo puede subirse de nuevo si hace falta
    e.target.value = ''
  }

  async function handleRemove() {
    setRemoving(true)
    const result = await removeTenantLogo(tenantId)
    setRemoving(false)

    if (!result.success) {
      toast.error('No se pudo quitar el logo', { description: result.error })
      return
    }

    setPreview(null)
    toast.success('Logo eliminado')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Preview — siempre sobre fondo blanco para que logos negros sean visibles */}
      <div className="flex items-center gap-4">
        {/* Preview sobre fondo claro para que logos oscuros sean siempre visibles */}
        <div className="h-16 w-48 rounded-lg bg-white border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden px-3 py-2">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Logo del tenant"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-400">Sin logo</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading || removing}
            onClick={() => inputRef.current?.click()}
            className="gap-2 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white text-xs"
          >
            {uploading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Subiendo...</>
              : <><Upload className="h-3.5 w-3.5" />Subir imagen</>}
          </Button>

          {preview && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={uploading || removing}
              onClick={handleRemove}
              className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs"
            >
              {removing
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Quitando...</>
                : <><Trash2 className="h-3.5 w-3.5" />Quitar</>}
            </Button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        SVG, PNG, JPG o WebP · máx. {MAX_KB} KB.<br />
        <span className="text-zinc-600">
          Para SVGs: exportar con viewBox ajustado al contenido, sin espacios en blanco alrededor.
        </span>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
