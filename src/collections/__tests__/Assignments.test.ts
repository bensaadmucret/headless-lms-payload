import { Assignments } from '../Assignments';
import type { Field } from 'payload';

describe('Assignments Collection', () => {
  it('should have the correct slug', () => {
    expect(Assignments.slug).toBe('assignments');
  });

  it('should use the correct title field in admin', () => {
    expect(Assignments.admin?.useAsTitle).toBe('title');
  });

  it('should define all expected fields', () => {
    // On ne garde que les champs qui possèdent un name de type string
    interface FieldWithName { name?: string }
    const fields = (Assignments.fields as FieldWithName[]).filter(f => typeof f.name === 'string');
    const fieldNames = fields.map(f => f.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining(['title', 'description', 'course', 'dueDate', 'submitted'])
    );
  });

  it('should set required and default properties correctly', () => {
    const fields = Assignments.fields as { name?: string; required?: boolean; defaultValue?: boolean }[];
    const titleField = fields.find(f => f.name === 'title');
    expect(titleField && 'required' in titleField ? titleField.required : undefined).toBe(true);

    const submittedField = fields.find(f => f.name === 'submitted');
    expect(submittedField && 'defaultValue' in submittedField ? submittedField.defaultValue : undefined).toBe(false);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expect(Array.isArray(Assignments.hooks?.afterChange)).toBe(true);
    expect(Array.isArray(Assignments.hooks?.afterDelete)).toBe(true);
  });
});
