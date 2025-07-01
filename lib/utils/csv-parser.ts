import Papa from 'papaparse'

export interface ParseResult<T> {
  data: T[]
  errors: Papa.ParseError[]
  meta: Papa.ParseMeta
}

export interface CSVParserOptions {
  header?: boolean
  skipEmptyLines?: boolean
  dynamicTyping?: boolean
  encoding?: string
}

export class CSVParser {
  static async parseFile<T = any>(
    file: File,
    options: CSVParserOptions = {}
  ): Promise<ParseResult<T>> {
    const defaultOptions: Papa.ParseConfig = {
      header: options.header ?? true,
      skipEmptyLines: options.skipEmptyLines ?? true,
      dynamicTyping: options.dynamicTyping ?? false,
      encoding: options.encoding ?? 'UTF-8',
      complete: () => {},
      error: () => {},
      // Ensure we're not using worker threads which might cause FileReaderSync issues
      worker: false,
      // Use the browser's FileReader API
      download: false,
      // Add delimiters detection
      delimiter: "",
      newline: "",
      quoteChar: '"',
      escapeChar: '"',
      transformHeader: undefined,
      preview: 0,
      comments: false,
      fastMode: undefined,
      beforeFirstChunk: undefined,
      withCredentials: undefined
    }

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        ...defaultOptions,
        complete: (results) => {
          resolve({
            data: results.data as T[],
            errors: results.errors,
            meta: results.meta
          })
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }

  static parseString<T = any>(
    csvString: string,
    options: CSVParserOptions = {}
  ): ParseResult<T> {
    const defaultOptions: Papa.ParseConfig = {
      header: options.header ?? true,
      skipEmptyLines: options.skipEmptyLines ?? true,
      dynamicTyping: options.dynamicTyping ?? false
    }

    const results = Papa.parse(csvString, defaultOptions)

    return {
      data: results.data as T[],
      errors: results.errors,
      meta: results.meta
    }
  }

  static validateHeaders(
    actualHeaders: string[],
    requiredHeaders: string[],
    optionalHeaders: string[] = []
  ): { valid: boolean; missing: string[]; extra: string[] } {
    const actualSet = new Set(actualHeaders)
    const requiredSet = new Set(requiredHeaders)
    const allValidHeaders = new Set([...requiredHeaders, ...optionalHeaders])

    const missing = requiredHeaders.filter(h => !actualSet.has(h))
    const extra = actualHeaders.filter(h => !allValidHeaders.has(h))

    return {
      valid: missing.length === 0,
      missing,
      extra
    }
  }

  static generateCSV<T extends Record<string, any>>(
    data: T[],
    headers?: string[]
  ): string {
    if (data.length === 0) return ''

    const actualHeaders = headers || Object.keys(data[0])
    const config: Papa.UnparseConfig = {
      header: true,
      columns: actualHeaders
    }

    return Papa.unparse(data, config)
  }

  static downloadCSV(
    csvContent: string,
    filename: string
  ): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Type-safe field mapping for imports
export interface FieldMapping {
  csvField: string
  dbField: string
  required: boolean
  transform?: (value: any) => any
  validate?: (value: any) => boolean | string
}

export class CSVFieldMapper {
  static mapFields<T extends Record<string, any>>(
    data: any[],
    fieldMappings: FieldMapping[]
  ): { mappedData: T[]; errors: Array<{ row: number; field: string; error: string }> } {
    const mappedData: T[] = []
    const errors: Array<{ row: number; field: string; error: string }> = []

    data.forEach((row, index) => {
      const mappedRow: any = {}
      let hasError = false

      fieldMappings.forEach(mapping => {
        const value = row[mapping.csvField]

        // Check required fields
        if (mapping.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: index + 2, // Account for header row
            field: mapping.csvField,
            error: `${mapping.csvField} is required`
          })
          hasError = true
          return
        }

        // Apply validation if provided
        if (value !== undefined && value !== null && value !== '' && mapping.validate) {
          const validationResult = mapping.validate(value)
          if (validationResult !== true) {
            errors.push({
              row: index + 2,
              field: mapping.csvField,
              error: typeof validationResult === 'string' ? validationResult : `Invalid ${mapping.csvField}`
            })
            hasError = true
            return
          }
        }

        // Apply transformation if provided
        const finalValue = mapping.transform ? mapping.transform(value) : value
        
        // Only set if value exists or field is not required
        if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
          mappedRow[mapping.dbField] = finalValue
        }
      })

      if (!hasError) {
        mappedData.push(mappedRow as T)
      }
    })

    return { mappedData, errors }
  }
}

// Common validation functions
export const CSVValidators = {
  isEmail: (value: string): boolean | string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) || 'Invalid email format'
  },

  isNumber: (value: any): boolean | string => {
    return !isNaN(Number(value)) || 'Must be a number'
  },

  isPositiveNumber: (value: any): boolean | string => {
    const num = Number(value)
    return (!isNaN(num) && num >= 0) || 'Must be a positive number'
  },

  isBoolean: (value: any): boolean | string => {
    const lowerValue = String(value).toLowerCase()
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue) || 'Must be true/false, yes/no, or 1/0'
  },

  maxLength: (length: number) => (value: string): boolean | string => {
    return value.length <= length || `Maximum length is ${length} characters`
  },

  minLength: (length: number) => (value: string): boolean | string => {
    return value.length >= length || `Minimum length is ${length} characters`
  },

  inList: (validValues: string[]) => (value: string): boolean | string => {
    return validValues.includes(value) || `Must be one of: ${validValues.join(', ')}`
  }
}

// Common transformation functions
export const CSVTransformers = {
  toNumber: (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  },

  toBoolean: (value: any): boolean => {
    const lowerValue = String(value).toLowerCase()
    return ['true', '1', 'yes'].includes(lowerValue)
  },

  trim: (value: string): string => {
    return String(value).trim()
  },

  toUpperCase: (value: string): string => {
    return String(value).toUpperCase()
  },

  toLowerCase: (value: string): string => {
    return String(value).toLowerCase()
  },

  toDate: (value: string): Date | null => {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  },

  toDecimal: (precision: number) => (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : Number(num.toFixed(precision))
  }
}