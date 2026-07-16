import * as fs from 'fs'
import * as path from 'path'
import Parser from 'tree-sitter'
import Java from 'tree-sitter-java'
import type {
  ParsedAPI,
  ControllerInfo,
  ApiMethod,
  ApiParameter,
  HttpMethod,
  ParamLocation,
  TypeInfo,
  TypeField,
  ParseError,
  ConfigHints,
  ValidationConstraint
} from './types'

// ---- Tree-sitter initialization ----
const javaParser = new Parser()
javaParser.setLanguage(Java as unknown as Parser.Language)

// ---- Public API ----

/**
 * Parse a list of Java Controller files into a structured ParsedAPI result.
 * @param filePaths - Controller file paths from the scanner
 * @param allJavaFilePaths - ALL .java files in the project (for DTO/VO resolution)
 * @param rootPath - Project root path
 * @param configHints - Configuration hints from scanner
 */
export function parseControllers(
  filePaths: string[],
  allJavaFilePaths: string[],
  rootPath: string,
  configHints: ConfigHints
): ParsedAPI {
  const projectName = path.basename(rootPath)
  const controllers: ControllerInfo[] = []
  const errors: ParseError[] = []

  // Build a type registry from all Java files for DTO/VO resolution
  const typeRegistry = buildTypeRegistry(allJavaFilePaths)

  for (const filePath of filePaths) {
    try {
      const controller = parseControllerFile(filePath, typeRegistry, allJavaFilePaths)
      if (controller) {
        controllers.push(controller)
      }
    } catch (err: unknown) {
      errors.push({
        filePath,
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return { projectName, controllers, configHints, errors }
}

// ---- Type Registry (for DTO/VO field resolution) ----

interface TypeEntry {
  fields: TypeField[]
  isEnum: boolean
  enumValues: string[]
}

function buildTypeRegistry(allJavaFiles: string[]): Map<string, TypeEntry> {
  const registry = new Map<string, TypeEntry>()

  for (const filePath of allJavaFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const tree = javaParser.parse(content)

      const className = extractClassName(tree.rootNode)
      if (!className) continue

      // Check if it's an enum
      const isEnum = hasAnnotationOrModifier(tree.rootNode, 'enum')

      if (isEnum) {
        const enumValues = extractEnumValues(tree.rootNode)
        registry.set(className, { fields: [], isEnum: true, enumValues })
      } else {
        const fields = extractTypeFields(tree.rootNode)
        registry.set(className, { fields, isEnum: false, enumValues: [] })
      }
    } catch {
      // Skip unparseable files
    }
  }

  return registry
}

// ---- Controller File Parser ----

function parseControllerFile(
  filePath: string,
  typeRegistry: Map<string, TypeEntry>,
  allJavaFiles: string[]
): ControllerInfo | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const tree = javaParser.parse(content)
  const rootNode = tree.rootNode

  // Find the class declaration node
  const classNode = findClassDeclaration(rootNode)
  if (!classNode) return null

  const className = extractClassName(rootNode)
  const packagePath = extractPackagePath(rootNode)
  const classAnnotations = extractAnnotations(classNode)

  // Extract base path from @RequestMapping
  const basePath = extractAnnotationValue(classAnnotations, 'RequestMapping', 'value') ||
    extractAnnotationValue(classAnnotations, 'RequestMapping', '') ||
    ''

  // Extract Javadoc above the class
  const javadoc = extractJavadoc(classNode)

  // Check @Deprecated
  const isDeprecated = classAnnotations.some(a => a.startsWith('@Deprecated'))

  // Swagger tags
  const swaggerTags = extractSwaggerTags(classAnnotations)

  // Display name: annotation name > javadoc first line > className
  const displayName = extractControllerDisplayName(classAnnotations, javadoc, className)

  // Parse methods
  const methods = extractMethods(classNode, basePath, typeRegistry, allJavaFiles, filePath)

  return {
    className,
    displayName,
    packagePath,
    filePath,
    basePath,
    javadoc,
    annotations: classAnnotations,
    isDeprecated,
    swaggerTags,
    methods
  }
}

// ---- AST Node Helpers ----

function findClassDeclaration(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (const child of node.namedChildren) {
    if (child.type === 'class_declaration') {
      return child
    }
    // Handle nested/inner classes inside other class_declarations
    if (child.type === 'class_declaration') {
      const inner = findClassDeclarationInClass(child)
      if (inner) return inner
    }
  }
  return null
}

function findClassDeclarationInClass(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const body = node.namedChildren.find(c => c.type === 'class_body')
  if (!body) return null
  for (const child of body.namedChildren) {
    if (child.type === 'class_declaration') {
      // Check if this inner class is a Controller
      const anns = extractAnnotations(child)
      if (anns.some(a => a.includes('RestController') || a.includes('Controller'))) {
        return child
      }
    }
  }
  return null
}

function extractClassName(node: Parser.SyntaxNode): string {
  const classNode = node.descendantsOfType('class_declaration')[0]
    || node.children.find(c => c.type === 'class_declaration')
  if (!classNode) {
    // Check for enum
    const enumNode = node.descendantsOfType('enum_declaration')[0]
    if (enumNode) {
      const nameNode = enumNode.childForFieldName('name')
      return nameNode?.text || 'Unknown'
    }
    return 'Unknown'
  }
  const nameNode = classNode.childForFieldName('name')
  return nameNode?.text || 'Unknown'
}

function extractPackagePath(node: Parser.SyntaxNode): string {
  const pkgNode = node.descendantsOfType('package_declaration')[0]
  if (!pkgNode) return ''
  const scopedName = pkgNode.namedChildren.find(c => c.type === 'scoped_identifier')
  if (scopedName) return scopedName.text
  const ident = pkgNode.namedChildren.find(c => c.type === 'identifier')
  return ident?.text || ''
}

// ---- Annotation Extraction ----

function extractAnnotations(node: Parser.SyntaxNode): string[] {
  const modifiers = node.namedChildren.filter(c => c.type === 'modifiers')
  const annotations: string[] = []

  for (const mod of modifiers) {
    for (const child of mod.namedChildren) {
      if (child.type === 'marker_annotation') {
        const name = child.namedChildren[0]?.text || child.text
        annotations.push('@' + name.replace('@', ''))
      } else if (child.type === 'annotation') {
        annotations.push(child.text)
      }
    }
  }

  return annotations
}

function extractAnnotationValue(
  annotations: string[],
  annotationName: string,
  attributeName: string
): string | null {
  // Look for @AnnotationName(value = "...") or @AnnotationName("...")
  const prefix = '@' + annotationName

  for (const ann of annotations) {
    if (!ann.startsWith(prefix)) continue

    // Bare value: @RequestMapping("/path")
    const bareMatch = ann.match(new RegExp(`^@${annotationName}\\("([^"]*)"\\)`))
    if (bareMatch && !attributeName) return bareMatch[1]

    // Bare with path: @RequestMapping("/prefix")
    const bareMatch2 = ann.match(new RegExp(`^@${annotationName}\\(\\s*"([^"]*)"\\s*\\)`))
    if (bareMatch2) return bareMatch2[1]

    // Named value: @RequestMapping(value = "/path")
    if (attributeName) {
      const match = ann.match(new RegExp(`${attributeName}\\s*=\\s*"([^"]*)"`))
      if (match) return match[1]

      // Array value: @RequestMapping(value = {"/a", "/b"}) — return first
      const arrMatch = ann.match(new RegExp(`${attributeName}\\s*=\\s*\\{\\s*"([^"]*)"`))
      if (arrMatch) return arrMatch[1]
    }

    // path attribute (shorthand): @GetMapping("/path") where annotation IS the path
    if (!attributeName || attributeName === 'value') {
      const m = ann.match(new RegExp(`^@${annotationName}\\("([^"]*)"\\)`))
      if (m) return m[1]
    }
  }

  return null
}

function hasAnnotation(annotations: string[], name: string): boolean {
  return annotations.some(a => a.startsWith('@' + name + '(') || a === '@' + name)
}

function extractSwaggerTags(annotations: string[]): string[] {
  const tags: string[] = []
  for (const ann of annotations) {
    // @Tag(name = "User") — Swagger v3
    const tagMatch = ann.match(/@Tag\(\s*name\s*=\s*"([^"]+)"/)
    if (tagMatch) { tags.push(tagMatch[1]); continue }

    // @Api(...) — Swagger v2
    if (!ann.startsWith('@Api(')) continue

    // @Api("xxx") — bare value shorthand
    const bareMatch = ann.match(/^@Api\(\s*"([^"]+)"\s*\)/)
    if (bareMatch) { tags.push(bareMatch[1]); continue }

    // @Api(tags = "xxx")
    const apiTagsMatch = ann.match(/tags\s*=\s*"([^"]+)"/)
    if (apiTagsMatch) { tags.push(apiTagsMatch[1]); continue }

    // @Api(value = "xxx")
    const apiValueMatch = ann.match(/value\s*=\s*"([^"]+)"/)
    if (apiValueMatch) tags.push(apiValueMatch[1])
  }
  return tags
}

/**
 * Extract the display name for a controller from annotations.
 * Priority: @Tag(name) > @Api(tags/value) > Javadoc first line > className
 */
function extractControllerDisplayName(
  annotations: string[],
  javadoc: string,
  className: string
): string {
  // 1. @Tag(name = "xxx") — Swagger v3 / OpenAPI 3
  for (const ann of annotations) {
    const tagMatch = ann.match(/@Tag\(\s*name\s*=\s*"([^"]+)"/)
    if (tagMatch) return tagMatch[1]
  }

  // 2. @Api(...) — Swagger v2
  for (const ann of annotations) {
    if (!ann.startsWith('@Api(')) continue

    // @Api("xxx") — bare value shorthand
    const bareMatch = ann.match(/^@Api\(\s*"([^"]+)"\s*\)/)
    if (bareMatch) return bareMatch[1]

    // @Api(tags = "xxx")
    const tagsMatch = ann.match(/tags\s*=\s*"([^"]+)"/)
    if (tagsMatch) return tagsMatch[1]

    // @Api(value = "xxx")
    const valueMatch = ann.match(/value\s*=\s*"([^"]+)"/)
    if (valueMatch) return valueMatch[1]
  }

  // 3. Javadoc first line (non-empty, skip @author/@since tags)
  if (javadoc) {
    const firstLine = javadoc.split('\n')[0].trim()
    if (firstLine && !firstLine.startsWith('@')) {
      return firstLine
    }
  }

  // 4. Fallback to class name
  return className
}

// ---- Javadoc Extraction ----

function extractJavadoc(node: Parser.SyntaxNode): string {
  // Look for preceding comment
  const parent = node.parent
  if (!parent) return ''

  const children = parent.namedChildren
  const idx = children.indexOf(node)
  if (idx <= 0) return ''

  // Check preceding sibling for block_comment
  const prev = children[idx - 1]
  if (prev && (prev.type === 'block_comment' || prev.type === 'line_comment')) {
    let text = prev.text
    // Clean up Javadoc formatting
    text = text
      .replace(/^\/\*\*?\s*\n?/, '')
      .replace(/\s*\*\/\s*$/, '')
      .split('\n')
      .map(line => line.replace(/^\s*\*\s?/, ''))
      .join('\n')
      .trim()

    // Remove @author, @since, @see lines from display but keep them accessible
    return text
  }

  return ''
}

// ---- Method Extraction ----

function extractMethods(
  classNode: Parser.SyntaxNode,
  basePath: string,
  typeRegistry: Map<string, TypeEntry>,
  allJavaFiles: string[],
  filePath: string
): ApiMethod[] {
  const bodyNode = classNode.namedChildren.find(c => c.type === 'class_body')
  if (!bodyNode) return []

  const methods: ApiMethod[] = []
  const seenSignatures = new Set<string>()

  for (const child of bodyNode.namedChildren) {
    if (child.type !== 'method_declaration') continue

    const methodName = child.childForFieldName('name')?.text || 'unknown'
    const methodAnnotations = extractAnnotations(child)

    // Skip non-HTTP methods
    const httpAnn = methodAnnotations.find(
      a => a.includes('RequestMapping') || a.includes('Mapping')
    )
    if (!httpAnn) continue

    // Skip WebSocket methods
    if (hasAnnotation(methodAnnotations, 'MessageMapping') ||
        hasAnnotation(methodAnnotations, 'SubscribeMapping') ||
        hasAnnotation(methodAnnotations, 'MessageExceptionHandler')) {
      continue
    }

    // Parse HTTP methods
    const httpMethods = parseHttpMethods(httpAnn)

    // Parse path
    const methodPath = extractAnnotationValue(methodAnnotations, getAnnotationName(httpAnn), 'value') ||
      extractAnnotationValue(methodAnnotations, getAnnotationName(httpAnn), '') ||
      ''

    const fullPath = joinPaths(basePath, methodPath)

    // Overload disambiguation
    const paramTypes = extractParamTypes(child)
    const sig = methodName + '(' + paramTypes.join(',') + ')'
    const overloadSuffix = seenSignatures.has(sig) ? '' : ''
    // Detect if there are other overloads
    const hasOverloads = checkOverloads(bodyNode, methodName)
    const displayName = hasOverloads && paramTypes.length > 0
      ? methodName + '(' + paramTypes.join(', ') + ')'
      : methodName
    seenSignatures.add(sig)

    // Summary priority: @Operation > @ApiOperation > Javadoc first line
    const javadoc = extractJavadoc(child)
    const summary =
      extractAnnotationValue(methodAnnotations, 'Operation', 'summary') ||
      extractAnnotationValue(methodAnnotations, 'ApiOperation', 'value') ||
      javadoc.split('\n')[0] ||
      ''

    // Deprecated
    const isDeprecated = methodAnnotations.some(a => a.startsWith('@Deprecated'))

    // Response status
    const respStatus = extractAnnotationValue(methodAnnotations, 'ResponseStatus', 'code') ||
      extractAnnotationValue(methodAnnotations, 'ResponseStatus', 'value')

    // Consumes / Produces
    const consumes = extractAnnotationValue(methodAnnotations, getAnnotationName(httpAnn), 'consumes')
    const produces = extractAnnotationValue(methodAnnotations, getAnnotationName(httpAnn), 'produces')

    // Parse parameters
    const parameters = extractParameters(child, typeRegistry, allJavaFiles, filePath)

    // Parse return type
    const responseType = extractReturnType(child, typeRegistry, allJavaFiles, filePath)

    methods.push({
      methodName: displayName,
      httpMethods,
      fullPath,
      summary,
      description: javadoc,
      javadoc,
      annotations: methodAnnotations,
      isDeprecated,
      responseStatus: respStatus ? parseInt(respStatus, 10) : undefined,
      consumes: consumes || undefined,
      produces: produces || undefined,
      parameters,
      responseType
    })
  }

  return methods
}

function parseHttpMethods(annotationText: string): HttpMethod[] {
  const name = getAnnotationName(annotationText)

  switch (name) {
    case 'GetMapping': return ['GET']
    case 'PostMapping': return ['POST']
    case 'PutMapping': return ['PUT']
    case 'DeleteMapping': return ['DELETE']
    case 'PatchMapping': return ['PATCH']
    case 'RequestMapping': {
      const methodMatch = annotationText.match(/method\s*=\s*(?:RequestMethod\.(\w+)|(\{[^}]*\})|(\w+))/)
      if (methodMatch) {
        const methodStr = methodMatch[1] || methodMatch[2] || methodMatch[3] || ''
        const methods: HttpMethod[] = []
        for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) {
          if (methodStr.includes(m)) methods.push(m as HttpMethod)
        }
        return methods.length > 0 ? methods : ['ALL']
      }
      return ['ALL']
    }
    default: return ['GET']
  }
}

function getAnnotationName(annotationText: string): string {
  const match = annotationText.match(/@(\w+)/)
  return match ? match[1] : 'RequestMapping'
}

function joinPaths(base: string, method: string): string {
  let result = ''
  if (base) result += base.startsWith('/') ? base : '/' + base
  if (method) result += method.startsWith('/') ? method : '/' + method
  // Remove trailing slash (unless root)
  if (result.length > 1 && result.endsWith('/')) {
    result = result.slice(0, -1)
  }
  // Remove duplicate slashes
  result = result.replace(/\/+/g, '/')
  return result || '/'
}

function checkOverloads(bodyNode: Parser.SyntaxNode, methodName: string): boolean {
  let count = 0
  for (const child of bodyNode.namedChildren) {
    if (child.type !== 'method_declaration') continue
    const nameNode = child.childForFieldName('name')
    if (nameNode?.text === methodName) count++
  }
  return count > 1
}

function extractParamTypes(methodNode: Parser.SyntaxNode): string[] {
  const params = methodNode.childForFieldName('parameters')
  if (!params) return []
  const types: string[] = []
  for (const child of params.namedChildren) {
    if (child.type === 'formal_parameter') {
      const typeNode = child.childForFieldName('type')
      if (typeNode) {
        types.push(typeNode.text)
      }
    }
  }
  return types
}

// ---- Parameter Extraction ----

function extractParameters(
  methodNode: Parser.SyntaxNode,
  typeRegistry: Map<string, TypeEntry>,
  allJavaFiles: string[],
  currentFilePath: string
): ApiParameter[] {
  const paramsNode = methodNode.childForFieldName('parameters')
  if (!paramsNode) return []

  const params: ApiParameter[] = []

  for (const child of paramsNode.namedChildren) {
    if (child.type !== 'formal_parameter') continue

    const paramAnnotations = extractAnnotations(child)
    const typeNode = child.childForFieldName('type')
    const nameNode = child.childForFieldName('name')
    const javaType = typeNode?.text || 'unknown'
    const paramName = nameNode?.text || 'unknown'

    // Skip framework-internal types
    if (javaType === 'HttpServletRequest' || javaType === 'HttpServletResponse' ||
        javaType === 'HttpSession' || javaType === 'BindingResult' ||
        javaType === 'Errors' || javaType === 'Principal') {
      continue
    }

    // Determine parameter location
    let location: ParamLocation = 'query'
    if (hasAnnotation(paramAnnotations, 'RequestBody') || hasAnnotation(paramAnnotations, 'RequestBody')) {
      location = 'body'
    } else if (hasAnnotation(paramAnnotations, 'PathVariable')) {
      location = 'path'
    } else if (hasAnnotation(paramAnnotations, 'RequestHeader')) {
      location = 'header'
    } else if (hasAnnotation(paramAnnotations, 'RequestPart')) {
      location = 'form'
    } else if (hasAnnotation(paramAnnotations, 'CookieValue')) {
      location = 'cookie'
    } else if (hasAnnotation(paramAnnotations, 'SessionAttribute')) {
      location = 'session'
    } else if (hasAnnotation(paramAnnotations, 'MatrixVariable')) {
      location = 'matrix'
    } else if (hasAnnotation(paramAnnotations, 'RequestAttribute')) {
      location = 'attribute'
    }

    // Annotation-specified name
    const annName = extractAnnotationValue(paramAnnotations, 'RequestParam', 'value') ||
      extractAnnotationValue(paramAnnotations, 'RequestParam', 'name') ||
      extractAnnotationValue(paramAnnotations, 'PathVariable', 'value') ||
      extractAnnotationValue(paramAnnotations, 'PathVariable', 'name')

    // Required
    let required = false
    const requiredStr = extractAnnotationValue(paramAnnotations, 'RequestParam', 'required') ||
      extractAnnotationValue(paramAnnotations, 'PathVariable', 'required')
    if (location === 'path') required = true // Path variables are always required in Spring
    if (requiredStr === 'true') required = true
    if (requiredStr === 'false') required = false

    // Default value
    const defaultValue = extractAnnotationValue(paramAnnotations, 'RequestParam', 'defaultValue')

    // Description priority: @Parameter > @ApiParam > @Schema
    const description =
      extractAnnotationValue(paramAnnotations, 'Parameter', 'description') ||
      extractAnnotationValue(paramAnnotations, 'ApiParam', 'value') ||
      ''

    // Validation constraints
    const constraints = extractConstraints(paramAnnotations)

    // Check if it's an enum
    const cleanType = javaType.replace(/^@\w+\s*/, '') // Remove leading annotation
    const typeEntry = typeRegistry.get(cleanType)
    const isEnum = typeEntry?.isEnum || false
    const enumValues = typeEntry?.enumValues || []

    // Check if it's a date type
    const isDate = ['Date', 'LocalDate', 'LocalDateTime', 'LocalTime', 'ZonedDateTime', 'Instant', 'Timestamp'].some(
      t => javaType.endsWith(t)
    )

    // Check if it's a file
    const isFile = javaType.includes('MultipartFile')

    // Generate example value
    const exampleJson = generateExample(cleanType, typeRegistry, 0)

    // Expand fields from known object types:
    // - @RequestBody params (body)
    // - Unannotated complex object params (Spring MVC binds query params to fields)
    let children: TypeField[] | undefined
    const hasExplicitSpringAnn = paramAnnotations.some(a =>
      a.startsWith('@RequestParam') || a.startsWith('@PathVariable') ||
      a.startsWith('@RequestHeader') || a.startsWith('@RequestPart') ||
      a.startsWith('@CookieValue') || a.startsWith('@SessionAttribute') ||
      a.startsWith('@MatrixVariable') || a.startsWith('@RequestAttribute')
    )
    const shouldExpand = location === 'body' ||
      (!hasExplicitSpringAnn && location === 'query' && typeEntry && !typeEntry.isEnum && typeEntry.fields.length > 0)
    if (shouldExpand && typeEntry && !typeEntry.isEnum) {
      children = typeEntry.fields.length > 0
        ? resolveNestedFields(typeEntry.fields, typeRegistry, 0, new Set([cleanType]))
        : typeEntry.fields
    }

    params.push({
      name: annName || paramName,
      javaType: cleanType,
      location,
      required,
      defaultValue,
      description,
      exampleJson,
      constraints,
      children,
      isEnum,
      enumValues,
      isDate,
      isFile
    })
  }

  return params
}

function extractConstraints(annotations: string[]): ValidationConstraint[] {
  const constraints: ValidationConstraint[] = []

  const constraintMap: Record<string, string> = {
    'NotNull': '不能为 null',
    'NotBlank': '不能为空',
    'NotEmpty': '不能为空',
    'Size': '长度限制',
    'Min': '最小值限制',
    'Max': '最大值限制',
    'Range': '数值范围限制',
    'Pattern': '格式限制',
    'Email': '邮箱格式',
    'Positive': '必须为正数',
    'Negative': '必须为负数',
    'PositiveOrZero': '必须为非负数',
    'NegativeOrZero': '必须为非正数',
    'AssertTrue': '必须为 true',
    'AssertFalse': '必须为 false',
    'Past': '必须是过去时间',
    'Future': '必须是未来时间',
    'PastOrPresent': '必须是过去或当前时间',
    'FutureOrPresent': '必须是未来或当前时间'
  }

  for (const [type, message] of Object.entries(constraintMap)) {
    for (const ann of annotations) {
      if (ann.startsWith('@' + type)) {
        const params: Record<string, string> = {}
        const msgMatch = ann.match(/message\s*=\s*"([^"]+)"/)
        if (type === 'Size' || type === 'Min' || type === 'Max' || type === 'Range') {
          const minMatch = ann.match(/min\s*=\s*(\d+)/)
          const maxMatch = ann.match(/max\s*=\s*(\d+)/)
          if (minMatch) params.min = minMatch[1]
          if (maxMatch) params.max = maxMatch[1]
        }
        if (type === 'Pattern') {
          const regexpMatch = ann.match(/regexp\s*=\s*"([^"]+)"/)
          if (regexpMatch) params.regexp = regexpMatch[1]
        }
        constraints.push({
          type,
          message: msgMatch ? msgMatch[1] : message,
          params
        })
      }
    }
  }

  return constraints
}

// ---- Return Type Extraction ----

function extractReturnType(
  methodNode: Parser.SyntaxNode,
  typeRegistry: Map<string, TypeEntry>,
  allJavaFiles: string[],
  currentFilePath: string
): TypeInfo {
  const typeNode = methodNode.childForFieldName('type')
  if (!typeNode) {
    return { rawType: 'void', isVoid: true, isReactive: false, isFileDownload: false, fields: [] }
  }

  const rawType = typeNode.text

  if (rawType === 'void') {
    return { rawType: 'void', isVoid: true, isReactive: false, isFileDownload: false, fields: [] }
  }

  // Detect wrapper types
  const wrapperTypes = ['R', 'Result', 'ResultVO', 'ResponseEntity', 'BaseResponse',
    'Mono', 'Flux', 'Observable', 'Single', 'CompletionStage', 'CompletableFuture']

  let wrapperType: string | undefined
  let innerType: string | undefined
  let isReactive = false
  let isFileDownload = false

  const reactiveWrappers = ['Mono', 'Flux', 'Observable', 'Single']

  // Extract generic: e.g. "R<List<UserVO>>", "CommonResponse<TestDemo>"
  // Use a regex that handles nested generics: capture the outer type name and the rest
  const genericMatch = rawType.match(/^(\w+)<(.+)>$/)
  if (genericMatch) {
    const wName = genericMatch[1]
    const innerTypes = genericMatch[2]
    if (wrapperTypes.includes(wName)) {
      wrapperType = wName
      isReactive = reactiveWrappers.includes(wName)
    } else {
      // Even if the wrapper isn't in the known list (e.g. CommonResponse),
      // still record it so it shows in the output
      wrapperType = wName
    }
    innerType = innerTypes
    // Check for file download
    if (rawType.includes('Resource') || rawType.includes('InputStream') || rawType.includes('StreamingResponseBody')) {
      isFileDownload = true
    }
  }

  // Resolve the actual data type from the innermost generic parameter
  let dataType = innerType || rawType
  // Strip known wrapper and collection types to get the core type
  dataType = dataType.replace(/^(?:List|Set|Collection|ArrayList|Page|Slice)<(.+)>$/, '$1')
  dataType = dataType.replace(/\[\]$/, '')

  // Look up fields from type registry
  const typeEntry = typeRegistry.get(dataType)
  const flatFields = typeEntry && !typeEntry.isEnum ? typeEntry.fields : []

  // Recursively resolve nested type fields
  const fields = flatFields.length > 0
    ? resolveNestedFields(flatFields, typeRegistry, 0, new Set([dataType]))
    : []

  return {
    rawType,
    wrapperType,
    innerType,
    isVoid: false,
    isReactive,
    isFileDownload,
    fields
  }
}

// ---- Type Field Extraction (from DTO/VO files) ----

function extractTypeFields(node: Parser.SyntaxNode): TypeField[] {
  const classNode = node.descendantsOfType('class_declaration')[0]
    || node.children.find(c => c.type === 'class_declaration')
  if (!classNode) return []

  const bodyNode = classNode.namedChildren.find(c => c.type === 'class_body')
  if (!bodyNode) return []

  const fields: TypeField[] = []

  for (const child of bodyNode.namedChildren) {
    if (child.type !== 'field_declaration') continue

    const fieldAnnotations = extractAnnotations(child)
    const typeNode = child.childForFieldName('type')
    const declarator = child.namedChildren.find(c => c.type === 'variable_declarator')
    const nameNode = declarator?.childForFieldName('name')

    if (!typeNode || !nameNode) continue

    const fieldName = nameNode.text
    const fieldType = typeNode.text

    // Description: @Schema > @ApiModelProperty
    const description =
      extractAnnotationValue(fieldAnnotations, 'Schema', 'description') ||
      extractAnnotationValue(fieldAnnotations, 'ApiModelProperty', 'value') ||
      ''

    fields.push({
      name: fieldName,
      javaType: fieldType,
      description
    })
  }

  return fields
}

// ---- Recursive Field Resolution ----

/** Primitive/wrapper types where recursion stops */
const PRIMITIVE_TYPES = new Set([
  'String', 'Integer', 'int', 'Long', 'long', 'Double', 'double',
  'Float', 'float', 'Boolean', 'boolean', 'Short', 'short', 'Byte', 'byte',
  'Character', 'char', 'BigDecimal', 'BigInteger',
  'LocalDate', 'LocalDateTime', 'LocalTime', 'ZonedDateTime', 'Instant',
  'Date', 'Timestamp', 'UUID', 'Object', 'ObjectNode', 'JsonNode',
  'byte[]', 'String[]', 'MultipartFile'
])

/** Resolve nested type fields recursively for response types and body parameters.
 *  Depth-limited to avoid infinite recursion on circular references. */
function resolveNestedFields(
  fields: TypeField[],
  typeRegistry: Map<string, TypeEntry>,
  depth: number,
  visited: Set<string>
): TypeField[] {
  const MAX_DEPTH = 5
  return fields.map(field => {
    const coreType = extractCoreType(field.javaType)

    // Truncation
    if (depth >= MAX_DEPTH) {
      return { ...field, truncated: true }
    }

    // Circular reference detection
    if (visited.has(coreType)) {
      return { ...field, circularRef: coreType }
    }

    // Stop at primitives / enums / generics without resolution
    if (PRIMITIVE_TYPES.has(coreType)) {
      return field
    }

    // Check if it's a known enum
    const typeEntry = typeRegistry.get(coreType)
    if (typeEntry?.isEnum) {
      return field
    }

    // Not in registry → can't resolve
    if (!typeEntry || typeEntry.fields.length === 0) {
      return field
    }

    // Recurse
    const nextVisited = new Set(visited)
    nextVisited.add(coreType)
    const children = resolveNestedFields(typeEntry.fields, typeRegistry, depth + 1, nextVisited)

    // Check if any child is polymorphic (has @JsonSubTypes or interface/abstract)
    const hasPolymorphic = children.some(c => c.polymorphic)

    return {
      ...field,
      children: children.length > 0 ? children : undefined,
      polymorphic: field.polymorphic || hasPolymorphic || undefined
    }
  })
}

/** Extract the core type name from a possibly-generic/collection/array type.
 *  e.g. "List<FooVO>" → "FooVO", "Map<String, Bar>" → "Bar", "Foo[]" → "Foo" */
function extractCoreType(javaType: string): string {
  let t = javaType.trim()
  // Strip array brackets
  t = t.replace(/\[\]$/, '')
  // Strip generic: keep the LAST type argument (most likely the "data" type)
  // "Map<String, Foo>" → "Foo"
  // "CommonResponse<Foo>" → "Foo"
  const genericMatch = t.match(/^(\w+)<(.+)>$/)
  if (genericMatch) {
    const innerTypes = genericMatch[2]
    // For multi-param generics (Map<K,V>), take the last param
    const parts = splitGenericArgs(innerTypes)
    t = parts[parts.length - 1] || innerTypes
  }
  // Strip collection wrappers to get actual type
  t = t.replace(/^(?:List|Set|Collection|ArrayList|Page|Slice|Optional)<(.+)>$/, '$1')
  return t
}

/** Split generic type arguments, handling nested generics.
 *  e.g. "String, List<Foo>, Bar" → ["String", "List<Foo>", "Bar"] */
function splitGenericArgs(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of s) {
    if (ch === '<') { depth++; current += ch }
    else if (ch === '>') { depth--; current += ch }
    else if (ch === ',' && depth === 0) { parts.push(current.trim()); current = '' }
    else { current += ch }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function extractEnumValues(node: Parser.SyntaxNode): string[] {
  const enumNode = node.descendantsOfType('enum_declaration')[0]
    || node.children.find(c => c.type === 'enum_declaration')
  if (!enumNode) return []

  const bodyNode = enumNode.namedChildren.find(c => c.type === 'enum_body')
  if (!bodyNode) return []

  const values: string[] = []
  for (const child of bodyNode.namedChildren) {
    if (child.type === 'enum_constant') {
      const nameNode = child.childForFieldName('name')
      if (nameNode) values.push(nameNode.text)
    }
  }
  return values
}

// ---- Helpers ----

function hasAnnotationOrModifier(node: Parser.SyntaxNode, name: string): boolean {
  for (const child of node.namedChildren) {
    if (child.type === name) return true
    if (child.type === 'modifiers') {
      for (const mod of child.namedChildren) {
        if (mod.type === name || mod.text === name) return true
      }
    }
  }
  return false
}

function generateExample(
  javaType: string,
  typeRegistry: Map<string, TypeEntry>,
  depth: number
): unknown {
  if (depth > 3) return null

  const typeMap: Record<string, unknown> = {
    'String': 'string',
    'int': 0,
    'Integer': 0,
    'long': 0,
    'Long': 0,
    'double': 0.0,
    'Double': 0.0,
    'float': 0.0,
    'Float': 0.0,
    'boolean': true,
    'Boolean': true,
    'BigDecimal': '0.00',
    'LocalDate': '2025-01-01',
    'Date': '2025-01-01',
    'LocalDateTime': '2025-01-01T00:00:00',
    'ZonedDateTime': '2025-01-01T00:00:00+08:00'
  }

  if (typeMap[javaType] !== undefined) return typeMap[javaType]

  // List / array
  if (javaType.includes('List<') || javaType.includes('Set<') || javaType.includes('[]')) {
    return []
  }

  // Enum
  const typeEntry = typeRegistry.get(javaType)
  if (typeEntry?.isEnum && typeEntry.enumValues.length > 0) {
    return typeEntry.enumValues[0]
  }

  // Object
  if (typeEntry && !typeEntry.isEnum && typeEntry.fields.length > 0) {
    const obj: Record<string, unknown> = {}
    for (const field of typeEntry.fields) {
      obj[field.name] = generateExample(field.javaType, typeRegistry, depth + 1)
    }
    return obj
  }

  return null
}
