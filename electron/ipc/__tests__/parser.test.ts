import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { parseControllers } from '../parser'
import { scanJavaProject } from '../scanner'
import { generateHtmlDoc } from '../generator'

const FIXTURES_DIR = path.resolve(__dirname, '../../../test/fixtures')

describe('PostEasy Parser Integration', () => {
  it('scans and parses fixture Java files correctly', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    expect(result.controllerFiles.length).toBeGreaterThan(0)
    expect(result.javaFiles.length).toBeGreaterThan(0)

    // Find UserController
    const userCtrl = result.controllerFiles.find(f => f.includes('UserController'))
    expect(userCtrl).toBeDefined()
  })

  it('parses Controller annotations and class info', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })
    const parsed = parseControllers(
      result.controllerFiles,
      result.javaFiles,
      FIXTURES_DIR,
      result.configHints
    )

    expect(parsed.controllers.length).toBeGreaterThan(0)
    const userCtrl = parsed.controllers.find(c => c.className === 'UserController')
    expect(userCtrl).toBeDefined()
    expect(userCtrl!.basePath).toBe('/api/user')
    expect(userCtrl!.packagePath).toBe('com.example.controller')
    expect(userCtrl!.javadoc).toContain('用户管理 Controller')
    expect(userCtrl!.swaggerTags).toContain('用户管理')
  })

  it('parses HTTP methods correctly', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })
    const parsed = parseControllers(
      result.controllerFiles,
      result.javaFiles,
      FIXTURES_DIR,
      result.configHints
    )

    const userCtrl = parsed.controllers.find(c => c.className === 'UserController')!
    const methods = userCtrl.methods

    // Should have POST, GET (x3), PUT, DELETE — 6 methods
    expect(methods.length).toBeGreaterThanOrEqual(6)

    const createUser = methods.find(m => m.methodName.includes('createUser'))
    expect(createUser).toBeDefined()
    expect(createUser!.httpMethods).toContain('POST')
    expect(createUser!.fullPath).toBe('/api/user/create')

    const getUser = methods.find(m => m.methodName.includes('getUser'))
    expect(getUser).toBeDefined()
    expect(getUser!.httpMethods).toContain('GET')
    expect(getUser!.fullPath).toBe('/api/user/{id}')

    const listUsers = methods.find(m => m.methodName.includes('listUsers'))
    expect(listUsers).toBeDefined()
    expect(listUsers!.httpMethods).toContain('GET')

    // Deprecated method
    const allUsers = methods.find(m => m.methodName.includes('getAllUsers'))
    expect(allUsers).toBeDefined()
    expect(allUsers!.isDeprecated).toBe(true)
  })

  it('parses parameters correctly', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })
    const parsed = parseControllers(
      result.controllerFiles,
      result.javaFiles,
      FIXTURES_DIR,
      result.configHints
    )

    const userCtrl = parsed.controllers.find(c => c.className === 'UserController')!
    const createUser = userCtrl.methods.find(m => m.methodName.includes('createUser'))!

    // Should have @RequestBody parameter
    const bodyParam = createUser.parameters.find(p => p.location === 'body')
    expect(bodyParam).toBeDefined()
    expect(bodyParam!.javaType).toBe('CreateUserRequest')

    // Check GET /list query params
    const listUsers = userCtrl.methods.find(m => m.methodName.includes('listUsers'))!
    expect(listUsers.parameters.length).toBeGreaterThanOrEqual(3)

    const pageParam = listUsers.parameters.find(p => p.name === 'page')
    expect(pageParam).toBeDefined()
    expect(pageParam!.location).toBe('query')
    expect(pageParam!.defaultValue).toBe('1')

    const sizeParam = listUsers.parameters.find(p => p.name === 'size')
    expect(sizeParam).toBeDefined()
    expect(sizeParam!.constraints.length).toBeGreaterThan(0)

    // File upload param
    const uploadAvatar = userCtrl.methods.find(m => m.methodName.includes('uploadAvatar'))!
    const fileParam = uploadAvatar.parameters.find(p => p.isFile)
    expect(fileParam).toBeDefined()
  })

  it('parses response types', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })
    const parsed = parseControllers(
      result.controllerFiles,
      result.javaFiles,
      FIXTURES_DIR,
      result.configHints
    )

    const userCtrl = parsed.controllers.find(c => c.className === 'UserController')!

    // R<UserVO> response
    const createUser = userCtrl.methods.find(m => m.methodName.includes('createUser'))!
    expect(createUser.responseType.rawType).toContain('R')
    expect(createUser.responseType.wrapperType).toBe('R')
    expect(createUser.responseType.isVoid).toBe(false)

    // R<Void> response
    const deleteUser = userCtrl.methods.find(m => m.methodName.includes('deleteUser'))!
    expect(deleteUser.responseType.wrapperType).toBe('R')

    // R<List<UserVO>>
    const listUsers = userCtrl.methods.find(m => m.methodName.includes('listUsers'))!
    expect(listUsers.responseType.wrapperType).toBe('R')
  })

  it('generates HTML document', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })
    const parsed = parseControllers(
      result.controllerFiles,
      result.javaFiles,
      FIXTURES_DIR,
      result.configHints
    )

    const html = generateHtmlDoc(parsed)

    // Basic HTML structure checks (actual Handlebars template is loaded in dev)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('UserController')
    expect(html).toContain('/api/user/create')
    expect(html).toContain('POST')
    expect(html).toContain('GET')
    // Template renders with injected data
    expect(html).toContain('fixtures - API 文档') // title from project name
  })

  it('handles empty input gracefully', () => {
    const parsed = parseControllers([], [], '/fake/path', {})
    expect(parsed.controllers).toHaveLength(0)
    expect(parsed.projectName).toBe('path')

    const html = generateHtmlDoc(parsed)
    expect(html).toContain('<!DOCTYPE html>')
  })
})
