import { ValidationError } from 'class-validator';
import { mapValidationErrors } from './validation-error.mapper';

describe('mapValidationErrors', () => {
  it('maps nested class-validator errors to clean field error records', () => {
    const errors: ValidationError[] = [
      {
        property: 'url',
        constraints: { isUrl: 'url must be a URL address' },
        children: [],
      },
    ];

    expect(mapValidationErrors(errors)).toEqual([
      { field: 'url', messages: ['url must be a URL address'] },
    ]);
  });
});
