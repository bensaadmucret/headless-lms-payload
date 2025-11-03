type PayloadRequestLike = { user?: { role?: string } | null };

export const payloadIsAdmin = ({ req }: { req: PayloadRequestLike }) =>
  req.user?.role === 'admin';

export const payloadIsStudent = ({ req }: { req: PayloadRequestLike }) =>
  req.user?.role === 'student';

export const payloadIsUser = ({ req }: { req: PayloadRequestLike }) =>
  req.user?.role === 'student';

export const payloadIsAdminOrUser = ({ req }: { req: PayloadRequestLike }) =>
  payloadIsAdmin({ req }) || payloadIsUser({ req });



export const payloadIsAnyone = (_args: unknown) => true;


// Pour Payload, tu peux ajouter et adapter d'autres helpers selon tes besoins métiers.
