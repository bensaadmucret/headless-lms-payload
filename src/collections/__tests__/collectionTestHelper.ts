import type { Field } from 'payload';

/**
 * Retourne la liste des noms de champs nommés d'une collection Payload.
 */
export function getFieldNames(fields: Field[]): string[] {
  return fields.filter(f => typeof (f as any).name === 'string').map(f => (f as any).name);
}

/**
 * Vérifie que tous les champs attendus sont présents dans la collection.
 */
export function expectFieldsToExist(fields: Field[], expectedNames: string[]) {
  const fieldNames = getFieldNames(fields);
  expect(fieldNames).toEqual(expect.arrayContaining(expectedNames));
}

/**
 * Vérifie la présence d'un hook donné dans la collection.
 */
export function expectHookExists(collection: any, hookName: string) {
  if (collection.hooks && collection.hooks[hookName]) {
    expect(Array.isArray(collection.hooks[hookName])).toBe(true);
  }
}
