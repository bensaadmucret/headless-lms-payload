// Helpers adaptés au format Payload ({ req }) => ...
export const payloadIsSuperAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'superadmin';

export const payloadIsAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'admin';

export const payloadIsTeacher = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'teacher';

export const payloadIsStudent = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'student';

export const payloadIsUser = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'teacher' || req.user?.role === 'student';

export const payloadIsAdminOrSuperAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'admin' || req.user?.role === 'superadmin';

export const payloadIsAdminOrUser = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === 'admin' || req.user?.role === 'teacher' || req.user?.role === 'student';

export const payloadIsAnyone = (_args: unknown) => true;

// Pour Payload, tu peux ajouter et adapter d'autres helpers selon tes besoins métiers.
