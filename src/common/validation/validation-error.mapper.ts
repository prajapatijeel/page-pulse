import { ValidationError } from 'class-validator';

export interface FieldValidationError {
  field: string;
  messages: string[];
}

export function mapValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldValidationError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const currentError = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];

    return [...currentError, ...mapValidationErrors(error.children ?? [], field)];
  });
}
