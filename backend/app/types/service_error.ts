export interface ServiceError {
  error: string
  status: number
}

export function isServiceError(result: unknown): result is ServiceError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    'status' in result &&
    typeof (result as ServiceError).error === 'string' &&
    typeof (result as ServiceError).status === 'number'
  )
}
