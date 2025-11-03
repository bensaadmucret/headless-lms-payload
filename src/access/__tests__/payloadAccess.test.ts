import { describe, it, expect } from 'vitest';
import {
  payloadIsAdmin,
  payloadIsStudent,
  payloadIsUser,
  payloadIsAdminOrUser,
  payloadIsAnyone
} from '../payloadAccess';

describe('payloadAccess', () => {


  describe('payloadIsAdmin', () => {
    it('should return true for admin role', () => {
      expect(payloadIsAdmin({ req: { user: { role: 'admin' } } })).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(payloadIsAdmin({ req: { user: { role: 'student' } } })).toBe(false);
    });

    it('should return false for null user', () => {
      expect(payloadIsAdmin({ req: { user: null } })).toBe(false);
    });
  });



  describe('payloadIsStudent', () => {
    it('should return true for student role', () => {
      expect(payloadIsStudent({ req: { user: { role: 'student' } } })).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(payloadIsStudent({ req: { user: { role: 'admin' } } })).toBe(false);

    });

    it('should return false for null user', () => {
      expect(payloadIsStudent({ req: { user: null } })).toBe(false);
    });
  });

  describe('payloadIsUser', () => {


    it('should return true for student role', () => {
      expect(payloadIsUser({ req: { user: { role: 'student' } } })).toBe(true);
    });

    it('should return false for admin roles', () => {
      expect(payloadIsUser({ req: { user: { role: 'admin' } } })).toBe(false);
    });

    it('should return false for null user', () => {
      expect(payloadIsUser({ req: { user: null } })).toBe(false);
    });
  });



  describe('payloadIsAdminOrUser', () => {
    it('should return true for admin role', () => {
      expect(payloadIsAdminOrUser({ req: { user: { role: 'admin' } } })).toBe(true);
    });



    it('should return true for student role', () => {
      expect(payloadIsAdminOrUser({ req: { user: { role: 'student' } } })).toBe(true);
    });



    it('should return false for null user', () => {
      expect(payloadIsAdminOrUser({ req: { user: null } })).toBe(false);
    });
  });

  describe('payloadIsAnyone', () => {
    it('should always return true', () => {
      expect(payloadIsAnyone({})).toBe(true);
      expect(payloadIsAnyone(null)).toBe(true);
      expect(payloadIsAnyone(undefined)).toBe(true);
      expect(payloadIsAnyone({ req: { user: { role: 'admin' } } })).toBe(true);
      expect(payloadIsAnyone({ req: { user: null } })).toBe(true);
    });
  });
});
