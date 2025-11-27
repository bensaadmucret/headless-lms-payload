export type Role = 'superadmin' | 'admin' | 'teacher' | 'student';

export const isSuperAdmin = (user?: { role?: Role }) =>
  user?.role === 'superadmin';

export const isAdmin = (user?: { role?: Role }) =>
  user?.role === 'admin';

export const isStudent = (user?: { role?: Role }) =>
  user?.role === 'student';

export const isTeacher = (user?: { role?: Role }) =>
  user?.role === 'teacher';

// "user" logique = enseignant ou étudiant
export const isUser = (user?: { role?: Role }) =>
  user?.role === 'teacher' || user?.role === 'student';

export const isAdminOrSuperAdmin = (user?: { role?: Role }) =>
  user?.role === 'admin' || user?.role === 'superadmin';

export const isAdminOrUser = (user?: { role?: Role }) =>
  isAdmin(user) || isUser(user);

