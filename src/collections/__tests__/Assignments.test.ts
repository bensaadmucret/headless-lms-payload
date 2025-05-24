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
    const fields = (Assignments.fields as Field[]).filter(f => typeof (f as unknown).name === 'string');
    const fieldNames = fields.map(f => (f as unknown).name);
    expect(fieldNames).toEqual(
      expect.arrayContaining(['title', 'description', 'course', 'dueDate', 'submitted'])
    );
  });

  it('should set required and default properties correctly', () => {
    const fields = Assignments.fields as Field[];
    const titleField = fields.find(f => (f as unknown).name === 'title');
    expect(titleField && 'required' in titleField ? (titleField as unknown).required : undefined).toBe(true);

    const submittedField = fields.find(f => (f as unknown).name === 'submitted');
    expect(submittedField && 'defaultValue' in submittedField ? (submittedField as unknown).defaultValue : undefined).toBe(false);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expect(Array.isArray(Assignments.hooks?.afterChange)).toBe(true);
    expect(Array.isArray(Assignments.hooks?.afterDelete)).toBe(true);
  });
});
