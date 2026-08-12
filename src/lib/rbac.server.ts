import 'server-only'
import { NextResponse } from 'next/server'
import type { JwtPayload } from './auth'
import { canWriteModule, getModuleForApiPath, hasModuleAccess, type Module } from './rbac'

export function requireModule(
  user: JwtPayload,
  module: Module,
  method: string,
): NextResponse | null {
  if (user.role === 'super_admin') return null

  if (!hasModuleAccess(user.role, module)) {
    return NextResponse.json({ error: 'Accès refusé pour votre rôle' }, { status: 403 })
  }

  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (writeMethods.includes(method.toUpperCase()) && !canWriteModule(user.role, module)) {
    return NextResponse.json({ error: 'Modification non autorisée pour votre rôle' }, { status: 403 })
  }

  return null
}

export function requireApiAccess(user: JwtPayload, pathname: string, method: string): NextResponse | null {
  const apiModule = getModuleForApiPath(pathname)
  if (!apiModule) return null
  return requireModule(user, apiModule, method)
}
