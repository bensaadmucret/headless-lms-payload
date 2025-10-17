import { describe, it, expect } from 'vitest';
import { authenticatedOrPublished } from '../authenticatedOrPublished';
import type { User } from '@/payload-types';

describe('authenticatedOrPublished', () => {
  it('should return true when user is authenticated', () => {
    const mockArgs = {
      req: {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'admin'
        } as User
      }
    } as any;

    expect(authenticatedOrPublished(mockArgs)).toBe(true);
  });

  it('should return published filter when user is not authenticated', () => {
    const mockArgs = {
      req: {
        user: null
      }
    } as any;

    const result = authenticatedOrPublished(mockArgs);
    
    expect(result).toEqual({
      _status: {
        equals: 'published'
      }
    });
  });

  it('should return published filter when user is undefined', () => {
    const mockArgs = {
      req: {
        user: undefined
      }
    } as any;

    const result = authenticatedOrPublished(mockArgs);
    
    expect(result).toEqual({
      _status: {
        equals: 'published'
      }
    });
  });

  it('should return true for authenticated users regardless of role', () => {
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
      } as any;

      expect(authenticatedOrPublished(mockArgs)).toBe(true);
    });
  });
});
