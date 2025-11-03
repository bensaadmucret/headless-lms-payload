export type Role = 'admin' | 'student';

type UserLike = { role?: string | null } | null | undefined;

export const isAdmin = (user?: UserLike) => user?.role === 'admin';

export const isStudent = (user?: UserLike) => user?.role === 'student';

// "user" logique = student seulement
export const isUser = (user?: UserLike) =>
  user?.role === 'student';

export const isAdminOrUser = (user?: UserLike) =>
  isAdmin(user) || isUser(user);

