import { isAdmin, isStudent, isUser, isAdminOrUser, Role } from '../../access/roles';

describe('Helpers de rôles Payload', () => {
  const admin = { role: 'admin' as Role };
  const student = { role: 'student' as Role };
  const noRole = {};

  it('isAdmin', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(student)).toBe(false);
    expect(isAdmin(noRole)).toBe(false);
  });

  it('isStudent', () => {
    expect(isStudent(student)).toBe(true);
    expect(isStudent(admin)).toBe(false);
    expect(isStudent(noRole)).toBe(false);
  });

  it('isUser (héritage logique)', () => {
    expect(isUser(student)).toBe(true);
    expect(isUser(admin)).toBe(false);
    expect(isUser(noRole)).toBe(false);
  });

  it('isAdminOrUser', () => {
    expect(isAdminOrUser(admin)).toBe(true);
    expect(isAdminOrUser(student)).toBe(true);
    expect(isAdminOrUser(noRole)).toBe(false);
  });

});
