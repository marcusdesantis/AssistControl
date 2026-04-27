export interface ApiResponse<T = unknown> {
  success:    boolean
  message:    string
  data?:      T
  errorCode?: string
}

export function apiOk<T>(data: T, message = 'OK'): Response {
  return Response.json({ success: true, message, data } satisfies ApiResponse<T>, { status: 200 })
}

export function apiCreated<T>(data: T, message = 'Created'): Response {
  return Response.json({ success: true, message, data } satisfies ApiResponse<T>, { status: 201 })
}

export function apiBadRequest(message: string, errorCode?: string): Response {
  return Response.json({ success: false, message, errorCode } satisfies ApiResponse, { status: 400 })
}

export function apiUnauthorized(message = 'No autorizado'): Response {
  return Response.json({ success: false, message } satisfies ApiResponse, { status: 401 })
}

export function apiForbidden(message = 'Acceso denegado'): Response {
  return Response.json({ success: false, message } satisfies ApiResponse, { status: 403 })
}

export function apiNotFound(message = 'No encontrado', errorCode?: string): Response {
  return Response.json({ success: false, message, errorCode } satisfies ApiResponse, { status: 404 })
}

export function apiServerError(message = 'Error interno del servidor'): Response {
  return Response.json({ success: false, message } satisfies ApiResponse, { status: 500 })
}
