'use server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { dbAdmin, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { ActionResult } from './auth'

// ─── updateNombre ─────────────────────────────────────────────
// Actualiza el nombre del usuario autenticado en la tabla usuarios.

export async function updateNombre(nombre: string): Promise<ActionResult> {
  const trimmed = nombre.trim()
  if (trimmed.length < 2) {
    return { success: false, error: 'El nombre debe tener al menos 2 caracteres.' }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: false, error: 'No autenticado.' }

  try {
    await dbAdmin
      .update(schema.usuarios)
      .set({ nombre: trimmed })
      .where(eq(schema.usuarios.id, currentUser.id))
  } catch (err) {
    console.error('[updateNombre] DB error:', err)
    return { success: false, error: 'No se pudo actualizar el nombre.' }
  }

  return { success: true }
}
