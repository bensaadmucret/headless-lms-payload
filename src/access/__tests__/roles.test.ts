import { describe, it, expect } from 'vitest'
import { isAdmin, isStudent, isUser, isAdminOrUser, type Role } from '../roles'

describe('Access Control - Roles', () => {
  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const user = { role: 'admin' as Role }
      expect(isAdmin(user)).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdmin({ role: 'student' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false)
    })
  })



  describe('isStudent', () => {
    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isStudent(user)).toBe(true)
    })

    it('should return false for non-student roles', () => {
      expect(isStudent({ role: 'admin' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isStudent(undefined)).toBe(false)
    })
  })

  describe('isUser', () => {


    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isUser(user)).toBe(true)
    })

    it('should return false for admin roles', () => {
      expect(isUser({ role: 'admin' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isUser(undefined)).toBe(false)
    })
  })

  describe('isAdminOrUser', () => {
    it('should return true for admin role', () => {
      const user = { role: 'admin' as Role }
      expect(isAdminOrUser(user)).toBe(true)
    })



    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isAdminOrUser(user)).toBe(true)
    })

    it('should return false for undefined user', () => {
      expect(isAdminOrUser(undefined)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle null user gracefully', () => {
      expect(isAdmin(null as any)).toBe(false)

      expect(isStudent(null as any)).toBe(false)
      expect(isUser(null as any)).toBe(false)
      expect(isAdminOrUser(null as any)).toBe(false)
    })

    it('should handle user with null role', () => {
      const user = { role: null as any }
      expect(isAdmin(user)).toBe(false)

      expect(isStudent(user)).toBe(false)
    })
  })
})
