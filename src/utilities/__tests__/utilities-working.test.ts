import { describe, it, expect } from 'vitest'
import deepMerge from '../deepMerge'
import canUseDOM from '../canUseDOM'
import { toKebabCase } from '../toKebabCase'

describe('Working Utilities', () => {
  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 3, c: 4 }
      
      const result = deepMerge(obj1, obj2)
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should merge nested objects', () => {
      const obj1 = { user: { name: 'John', age: 30 } }
      const obj2 = { user: { age: 31, city: 'Paris' } }
      
      const result = deepMerge(obj1, obj2)
      
      expect(result).toEqual({ 
        user: { name: 'John', age: 31, city: 'Paris' } 
      })
    })
  })

  describe('canUseDOM', () => {
    it('should return a boolean value', () => {
      expect(typeof canUseDOM).toBe('boolean')
    })
  })

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case')
      expect(toKebabCase('PascalCase')).toBe('pascal-case')
      expect(toKebabCase('longVariableName')).toBe('long-variable-name')
    })

    it('should handle single words', () => {
      expect(toKebabCase('word')).toBe('word')
      expect(toKebabCase('Word')).toBe('word')
    })

    it('should handle empty strings', () => {
      expect(toKebabCase('')).toBe('')
    })

    it('should handle strings with spaces', () => {
      expect(toKebabCase('hello world')).toBe('hello-world')
      expect(toKebabCase('Hello World Test')).toBe('hello-world-test')
    })
  })
})