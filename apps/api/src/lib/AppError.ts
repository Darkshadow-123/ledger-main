export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean
  
  constructor(message: string, statusCode: number, code: string) {
    super(message)
  
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  
    Error.captureStackTrace(this, this.constructor)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}