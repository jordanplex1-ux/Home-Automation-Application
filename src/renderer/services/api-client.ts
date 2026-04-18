export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string
  ) {
    super(message || `API error ${status}`)
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options || {}

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })

    if (!response.ok) {
      const body = await response.text().catch(() => null)
      throw new ApiError(response.status, body, `API error ${response.status}: ${response.statusText}`)
    }

    return await response.json() as T
  } finally {
    clearTimeout(timer)
  }
}
