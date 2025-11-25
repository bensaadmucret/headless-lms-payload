export type Role = 'superadmin' | 'admin' | 'student';

export const isSuperAdmin = (user?: { role?: Role }) =>
  user?.role === 'superadmin';

export const isAdmin = (user?: { role?: Role }) =>
  user?.role === 'admin';

export const isTeacher = (user?: { role?: Role }) =>
  user?.role === 'teacher';

export const isStudent = (user?: { role?: Role }) =>
  user?.role === 'student';

// "user" logique = student
export const isUser = (user?: { role?: Role }) =>
  user?.role === 'student';

export const isAdminOrSuperAdmin = (user?: { role?: Role }) =>
  user?.role === 'admin' || user?.role === 'superadmin';

export const isAdminOrUser = (user?: { role?: Role }) =>
  isAdmin(user) || isUser(user);

