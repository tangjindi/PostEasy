// ============================================================
// Shared types for PostEasy IPC communication
// Used by: scanner.ts, parser.ts, generator.ts, main.ts, preload.ts
// ============================================================

// ---- Scan / Config ----

export interface ScanOptions {
  rootPath: string
  excludeDirs?: string[]
}

export interface RecentProject {
  path: string
  name: string
  lastOpened: string // ISO date string
}

export interface SaveFileOptions {
  defaultName: string
  content: string
}

// ---- Parsed API Result ----

export interface ParsedAPI {
  projectName: string
  controllers: ControllerInfo[]
  configHints: ConfigHints
  errors: ParseError[]
}

export interface ConfigHints {
  contextPath?: string
  serverPort?: number
}

export interface ParseError {
  filePath: string
  message: string
  line?: number
}

// ---- Controller ----

export interface ControllerInfo {
  className: string
  displayName: string
  packagePath: string
  filePath: string
  basePath: string
  javadoc: string
  annotations: string[]
  isDeprecated: boolean
  swaggerTags: string[]
  methods: ApiMethod[]
}

// ---- Method ----

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL'

export interface ApiMethod {
  methodName: string
  httpMethods: HttpMethod[]
  fullPath: string
  summary: string
  description: string
  javadoc: string
  annotations: string[]
  isDeprecated: boolean
  responseStatus?: number
  consumes?: string
  produces?: string
  parameters: ApiParameter[]
  responseType: TypeInfo
}

// ---- Parameter ----

export type ParamLocation =
  | 'query'
  | 'path'
  | 'body'
  | 'header'
  | 'form'
  | 'cookie'
  | 'session'
  | 'matrix'
  | 'attribute'

export interface ApiParameter {
  name: string
  javaType: string
  location: ParamLocation
  required: boolean
  defaultValue?: string
  description: string
  exampleJson?: unknown
  constraints: ValidationConstraint[]
  children?: TypeField[] // expanded fields for @RequestBody
  isEnum: boolean
  enumValues: string[]
  isDate: boolean
  isFile: boolean
}

export interface ValidationConstraint {
  type: string // e.g. "NotNull", "Size", "Min", "Max", "Pattern"
  message: string
  params: Record<string, string>
}

// ---- Return Type ----

export interface TypeInfo {
  rawType: string
  wrapperType?: string // "R", "Result", "ResponseEntity", "Mono", "Flux", etc.
  innerType?: string
  isVoid: boolean
  isReactive: boolean
  isFileDownload: boolean
  fields: TypeField[]
}

export interface TypeField {
  name: string
  javaType: string
  description: string
  children?: TypeField[]
  truncated?: boolean
  circularRef?: string
  polymorphic?: boolean
}
