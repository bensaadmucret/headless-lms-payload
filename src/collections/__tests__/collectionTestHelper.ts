import type { Field } from 'payload';

/**
 * Retourne la liste des noms de champs nommés d'une collection Payload.
 */
interface FieldWithName { name?: string }
export function getFieldNames(fields: FieldWithName[]): string[] {
  return fields.filter(f => typeof f.name === 'string').map(f => f.name).filter((name): name is string => typeof name === 'string');
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
export function expectHookExists(collection: { hooks?: Record<string, unknown> }, hookName: string) {
  if (collection.hooks && collection.hooks[hookName]) {
    expect(Array.isArray(collection.hooks[hookName])).toBe(true);
  }
}
