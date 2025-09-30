import type { CollectionAfterReadHook } from 'payload';
import { User } from 'src/payload-types';
import type { PayloadRequest } from 'payload';

// The `user` collection has access control locked so that users are not publicly accessible
// This means that we need to populate the authors manually here to protect user privacy
// GraphQL will not return mutated user data that differs from the underlying schema
// So we use an alternative `populatedAuthors` field to populate the user data, hidden from the admin UI

type PopulatedAuthor = Pick<User, 'id' | 'name'>;

type PostWithPopulatedAuthors = {
  authors?: Array<string | { id: string }>;
  populatedAuthors?: PopulatedAuthor[];
  [key: string]: unknown;
};

export const populateAuthors: CollectionAfterReadHook = async ({ 
  doc, 
  req 
}: { 
  doc: PostWithPopulatedAuthors; 
  req: PayloadRequest 
}) => {
  if (doc.authors && Array.isArray(doc.authors) && doc.authors.length > 0) {
    const authorDocs: User[] = []

    for (const author of doc.authors) {
      try {
        const authorDoc = await req.payload.findByID({
          id: typeof author === 'object' ? author?.id : author,
          collection: 'users',
          depth: 0,
        })

        if (authorDoc) {
          authorDocs.push(authorDoc)
        }

        if (authorDocs.length > 0) {
          doc.populatedAuthors = authorDocs.map((authorDoc) => ({
id: authorDoc.id,
            name: authorDoc.name || '',
          }))
        }
      } catch {
        
      }
    }
  }

  return doc
}
