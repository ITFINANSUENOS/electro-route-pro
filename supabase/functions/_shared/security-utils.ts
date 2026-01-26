// Shared security utilities for edge functions

// Generic error messages - avoid exposing internal details
export const GENERIC_ERRORS = {
  VALIDATION: 'Datos de entrada inválidos',
  AUTH: 'Error de autenticación',
  PERMISSION: 'Permisos insuficientes',
  SERVER: 'Error procesando la solicitud',
  NOT_FOUND: 'Recurso no encontrado',
  DUPLICATE: 'El registro ya existe',
} as const;

// Maximum field lengths
export const MAX_LENGTHS = {
  nombre: 200,
  direccion: 500,
  email: 254,
  telefono: 20,
  cedula: 15,
  codigo: 10,
  zona: 50,
} as const;

// Sanitize field to prevent CSV injection
// Fields starting with =, +, -, @, tab, or carriage return could be interpreted as formulas
export function sanitizeCSVField(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  // Prefix dangerous characters with a single quote to neutralize them
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

// Validate email format
export function validateEmail(email: string): boolean {
  if (!email || email.length > MAX_LENGTHS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validate cedula format (Colombian ID - 6-12 digits)
export function validateCedula(cedula: string): boolean {
  if (!cedula || cedula.length > MAX_LENGTHS.cedula) return false;
  return /^\d{6,12}$/.test(cedula.trim());
}

// Validate phone format (digits with optional + prefix)
export function validatePhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  if (phone.length > MAX_LENGTHS.telefono) return false;
  return /^\+?\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ''));
}

// Truncate string to max length
export function truncateField(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  const sanitized = sanitizeCSVField(value);
  return sanitized.slice(0, maxLength);
}

// Sanitize error message - remove internal details
export function sanitizeErrorMessage(error: Error | unknown): string {
  if (!(error instanceof Error)) {
    return GENERIC_ERRORS.SERVER;
  }
  
  const msg = error.message.toLowerCase();
  
  // Map known error patterns to safe messages
  if (msg.includes('duplicate key') || msg.includes('already exists') || msg.includes('already been registered')) {
    return GENERIC_ERRORS.DUPLICATE;
  }
  if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
    return 'Referencia de datos inválida';
  }
  if (msg.includes('not found')) {
    return GENERIC_ERRORS.NOT_FOUND;
  }
  if (msg.includes('unauthorized') || msg.includes('invalid token')) {
    return GENERIC_ERRORS.AUTH;
  }
  if (msg.includes('permission') || msg.includes('denied')) {
    return GENERIC_ERRORS.PERMISSION;
  }
  
  // Default to generic server error
  return GENERIC_ERRORS.SERVER;
}

// Validate row count to prevent DoS
export const MAX_CSV_ROWS = 10000;

export function validateRowCount(rows: unknown[]): boolean {
  return Array.isArray(rows) && rows.length <= MAX_CSV_ROWS;
}
