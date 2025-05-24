import {
  isSuperAdmin,
  isAdmin,
  isTeacher,
  isStudent,
  isUser,
  isAdminOrSuperAdmin,
  isAdminOrUser,

  Role,
} from '../../access/roles';

describe('Helpers de rôles Payload', () => {
  const superadmin = { role: 'superadmin' as Role };
  const admin = { role: 'admin' as Role };
  const teacher = { role: 'teacher' as Role };
  const student = { role: 'student' as Role };
  const noRole = {};

  it('isSuperAdmin', () => {
    expect(isSuperAdmin(superadmin)).toBe(true);
    expect(isSuperAdmin(admin)).toBe(false);
    expect(isSuperAdmin(teacher)).toBe(false);
    expect(isSuperAdmin(student)).toBe(false);
    expect(isSuperAdmin(noRole)).toBe(false);
  });

  it('isAdmin', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(superadmin)).toBe(false);
    expect(isAdmin(teacher)).toBe(false);
    expect(isAdmin(student)).toBe(false);
    expect(isAdmin(noRole)).toBe(false);
  });

  it('isTeacher', () => {
    expect(isTeacher(teacher)).toBe(true);
    expect(isTeacher(admin)).toBe(false);
    expect(isTeacher(student)).toBe(false);
    expect(isTeacher(noRole)).toBe(false);
  });

  it('isStudent', () => {
    expect(isStudent(student)).toBe(true);
    expect(isStudent(teacher)).toBe(false);
    expect(isStudent(admin)).toBe(false);
    expect(isStudent(noRole)).toBe(false);
  });

  it('isUser (héritage logique)', () => {
    expect(isUser(teacher)).toBe(true);
    expect(isUser(student)).toBe(true);
    expect(isUser(admin)).toBe(false);
    expect(isUser(superadmin)).toBe(false);
    expect(isUser(noRole)).toBe(false);
  });

  it('isAdminOrSuperAdmin', () => {
    expect(isAdminOrSuperAdmin(admin)).toBe(true);
    expect(isAdminOrSuperAdmin(superadmin)).toBe(true);
    expect(isAdminOrSuperAdmin(teacher)).toBe(false);
    expect(isAdminOrSuperAdmin(student)).toBe(false);
    expect(isAdminOrSuperAdmin(noRole)).toBe(false);
  });

  it('isAdminOrUser', () => {
    expect(isAdminOrUser(admin)).toBe(true);
    expect(isAdminOrUser(teacher)).toBe(true);
    expect(isAdminOrUser(student)).toBe(true);
    expect(isAdminOrUser(superadmin)).toBe(false);
    expect(isAdminOrUser(noRole)).toBe(false);
  });

});
