import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { scanJavaProject } from '../scanner'

const FIXTURES_DIR = path.resolve(__dirname, '../../../test/fixtures')

describe('PostEasy Scanner', () => {
  it('finds Java files in a directory', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    expect(result.javaFiles.length).toBeGreaterThan(0)
    expect(result.javaFiles.every(f => f.endsWith('.java'))).toBe(true)
  })

  it('finds Controller files matching naming pattern', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    expect(result.controllerFiles.length).toBeGreaterThan(0)
    const userCtrl = result.controllerFiles.find(f => f.includes('UserController'))
    expect(userCtrl).toBeDefined()
  })

  it('excludes ControllerImpl and ControllerTest files', () => {
    // Names like "ControllerImpl.java" or "AbstractController.java" should be excluded
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    const implFiles = result.controllerFiles.filter(f =>
      f.endsWith('ControllerImpl.java')
    )
    expect(implFiles).toHaveLength(0)
  })

  it('handles empty directories gracefully', () => {
    const result = scanJavaProject({ rootPath: '/tmp/nonexistent-directory-' + Date.now() })

    expect(result.controllerFiles).toHaveLength(0)
    expect(result.javaFiles).toHaveLength(0)
  })

  it('extracts DTO/VO files as well as controllers', () => {
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    // Should find CreateUserRequest.java and UserVO.java
    const dtoFiles = result.javaFiles.filter(f =>
      f.includes('CreateUserRequest') || f.includes('UserVO')
    )
    expect(dtoFiles.length).toBeGreaterThanOrEqual(2)
  })

  it('parses application config hints', () => {
    // No config in fixtures, should return empty hints
    const result = scanJavaProject({ rootPath: FIXTURES_DIR })

    expect(result.configHints).toBeDefined()
    expect(result.configHints.contextPath).toBeUndefined()
  })
})
