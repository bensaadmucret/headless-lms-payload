import { describe, it, expect } from 'vitest';
import { anyone } from '../anyone';

describe('anyone', () => {
  it('should always return true', () => {
    expect(anyone({} as any)).toBe(true);
  });

  it('should return true with null args', () => {
    expect(anyone(null as any)).toBe(true);
  });

  it('should return true with undefined args', () => {
    expect(anyone(undefined as any)).toBe(true);
  });

  it('should return true regardless of user authentication', () => {
    const mockArgs = {
      req: {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'admin'
        }
      }
    } as any;

    expect(anyone(mockArgs)).toBe(true);
  });

  it('should return true for unauthenticated users', () => {
    const mockArgs = {
      req: {
        user: null
      }
    } as any;

    expect(anyone(mockArgs)).toBe(true);
  });
});
