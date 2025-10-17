import { describe, it, expect } from 'vitest'
import {
  isSuperAdmin,
  isAdmin,
  isTeacher,
  isStudent,
  isUser,
  isAdminOrSuperAdmin,
  isAdminOrUser,
  type Role,
} from '../roles'

describe('Access Control - Roles', () => {
  describe('isSuperAdmin', () => {
    it('should return true for superadmin role', () => {
      const user = { role: 'superadmin' as Role }
      expect(isSuperAdmin(user)).toBe(true)
    })

    it('should return false for non-superadmin roles', () => {
      expect(isSuperAdmin({ role: 'admin' as Role })).toBe(false)
      expect(isSuperAdmin({ role: 'teacher' as Role })).toBe(false)
      expect(isSuperAdmin({ role: 'student' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isSuperAdmin(undefined)).toBe(false)
    })

    it('should return false for user without role', () => {
      expect(isSuperAdmin({})).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      const user = { role: 'admin' as Role }
      expect(isAdmin(user)).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdmin({ role: 'superadmin' as Role })).toBe(false)
      expect(isAdmin({ role: 'teacher' as Role })).toBe(false)
      expect(isAdmin({ role: 'student' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isAdmin(undefined)).toBe(false)
    })
  })

  describe('isTeacher', () => {
    it('should return true for teacher role', () => {
      const user = { role: 'teacher' as Role }
      expect(isTeacher(user)).toBe(true)
    })

    it('should return false for non-teacher roles', () => {
      expect(isTeacher({ role: 'superadmin' as Role })).toBe(false)
      expect(isTeacher({ role: 'admin' as Role })).toBe(false)
      expect(isTeacher({ role: 'student' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isTeacher(undefined)).toBe(false)
    })
  })

  describe('isStudent', () => {
    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isStudent(user)).toBe(true)
    })

    it('should return false for non-student roles', () => {
      expect(isStudent({ role: 'superadmin' as Role })).toBe(false)
      expect(isStudent({ role: 'admin' as Role })).toBe(false)
      expect(isStudent({ role: 'teacher' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isStudent(undefined)).toBe(false)
    })
  })

  describe('isUser', () => {
    it('should return true for teacher role', () => {
      const user = { role: 'teacher' as Role }
      expect(isUser(user)).toBe(true)
    })

    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isUser(user)).toBe(true)
    })

    it('should return false for admin roles', () => {
      expect(isUser({ role: 'superadmin' as Role })).toBe(false)
      expect(isUser({ role: 'admin' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isUser(undefined)).toBe(false)
    })
  })

  describe('isAdminOrSuperAdmin', () => {
    it('should return true for superadmin role', () => {
      const user = { role: 'superadmin' as Role }
      expect(isAdminOrSuperAdmin(user)).toBe(true)
    })

    it('should return true for admin role', () => {
      const user = { role: 'admin' as Role }
      expect(isAdminOrSuperAdmin(user)).toBe(true)
    })

    it('should return false for non-admin roles', () => {
      expect(isAdminOrSuperAdmin({ role: 'teacher' as Role })).toBe(false)
      expect(isAdminOrSuperAdmin({ role: 'student' as Role })).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isAdminOrSuperAdmin(undefined)).toBe(false)
    })
  })

  describe('isAdminOrUser', () => {
    it('should return true for admin role', () => {
      const user = { role: 'admin' as Role }
      expect(isAdminOrUser(user)).toBe(true)
    })

    it('should return true for teacher role', () => {
      const user = { role: 'teacher' as Role }
      expect(isAdminOrUser(user)).toBe(true)
    })

    it('should return true for student role', () => {
      const user = { role: 'student' as Role }
      expect(isAdminOrUser(user)).toBe(true)
    })

    it('should return false for superadmin role', () => {
      const user = { role: 'superadmin' as Role }
      expect(isAdminOrUser(user)).toBe(false)
    })

    it('should return false for undefined user', () => {
      expect(isAdminOrUser(undefined)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle null user gracefully', () => {
      expect(isSuperAdmin(null as any)).toBe(false)
      expect(isAdmin(null as any)).toBe(false)
      expect(isTeacher(null as any)).toBe(false)
      expect(isStudent(null as any)).toBe(false)
      expect(isUser(null as any)).toBe(false)
      expect(isAdminOrSuperAdmin(null as any)).toBe(false)
      expect(isAdminOrUser(null as any)).toBe(false)
    })

    it('should handle user with null role', () => {
      const user = { role: null as any }
      expect(isSuperAdmin(user)).toBe(false)
      expect(isAdmin(user)).toBe(false)
      expect(isTeacher(user)).toBe(false)
      expect(isStudent(user)).toBe(false)
    })
  })
})
