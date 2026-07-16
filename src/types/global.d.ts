export {}

declare global {
  interface Window {
    posteasy: PostEasyAPI
  }
}

interface PostEasyAPI {
  platform: string
  selectFolder: () => Promise<string | null>
  scanFiles: (opts: ScanOptions) => Promise<ScanResult>
  parseFiles: (
    controllerPaths: string[],
    allJavaPaths: string[],
    rootPath: string,
    configHints: ConfigHints
  ) => Promise<ParsedAPI>
  generateDoc: (api: ParsedAPI, templatePath?: string, lang?: string) => Promise<string>
  saveFile: (opts: SaveFileOptions) => Promise<string | null>
  getRecentProjects: () => Promise<RecentProject[]>
  saveRecentProject: (project: RecentProject) => Promise<void>
}

interface ScanOptions {
  rootPath: string
  excludeDirs?: string[]
}

interface ScanResult {
  controllerFiles: string[]
  javaFiles: string[]
  configHints: ConfigHints
}

interface ConfigHints {
  contextPath?: string
  serverPort?: number
}

interface SaveFileOptions {
  defaultName: string
  content: string
  lang?: string
}

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ParsedAPI {
  projectName: string
  controllers: ControllerInfo[]
  configHints: ConfigHints
  errors: ParseError[]
}

interface ParseError {
  filePath: string
  message: string
  line?: number
}

interface ControllerInfo {
  className: string
  packagePath: string
  filePath: string
  basePath: string
  javadoc: string
  annotations: string[]
  isDeprecated: boolean
  swaggerTags: string[]
  methods: ApiMethod[]
}

interface ApiMethod {
  methodName: string
  httpMethods: string[]
  fullPath: string
  summary: string
  description: string
  javadoc: string
  annotations: string[]
  isDeprecated: boolean
  responseStatus?: number
  consumes?: string
  produces?: string
  parameters: ApiParam[]
  responseType: TypeInfo
}

interface ApiParam {
  name: string
  javaType: string
  location: string
  required: boolean
  defaultValue?: string
  description: string
  exampleJson?: unknown
  constraints: ValidationConstraint[]
  children?: TypeField[]
  isEnum: boolean
  enumValues: string[]
  isDate: boolean
  isFile: boolean
}

interface ValidationConstraint {
  type: string
  message: string
  params: Record<string, string>
}

interface TypeInfo {
  rawType: string
  wrapperType?: string
  innerType?: string
  isVoid: boolean
  isReactive: boolean
  isFileDownload: boolean
  fields: TypeField[]
}

interface TypeField {
  name: string
  javaType: string
  description: string
  children?: TypeField[]
  truncated?: boolean
  circularRef?: string
  polymorphic?: boolean
}
