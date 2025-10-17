import { describe, it, expect } from 'vitest';
import { authenticated } from '../authenticated';
import type { AccessArgs } from 'payload';
import type { User } from '@/payload-types';

describe('authenticated', () => {
  it('should return true when user is authenticated', () => {
    const mockArgs = {
      req: {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'admin'
        } as User
      }
    } as AccessArgs<User>;

    expect(authenticated(mockArgs)).toBe(true);
  });

  it('should return false when user is null', () => {
    const mockArgs = {
      req: {
        user: null
      }
    } as AccessArgs<User>;

    expect(authenticated(mockArgs)).toBe(false);
  });

  it('should return false when user is undefined', () => {
    const mockArgs = {
      req: {
        user: undefined
      }
    } as AccessArgs<User>;

    expect(authenticated(mockArgs)).toBe(false);
  });

  it('should return true for any authenticated user regardless of role', () => {
    const roles = ['admin', 'teacher', 'student', 'superadmin'];
    
    roles.forEach(role => {
      const mockArgs = {
        req: {
          user: {
            id: '123',
            email: 'test@example.com',
            role
          } as User
        }
      } as AccessArgs<User>;

      expect(authenticated(mockArgs)).toBe(true);
    });
  });
});
