import type { SelectField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import React from 'react'
import { ControlledSelect } from '../shared/ControlledSelect'

export const Select: React.FC<
  SelectField & {
    control: Control
    errors: Partial<FieldErrorsImpl>
  }
> = ({ name, control, errors, label, options, required, width, defaultValue }) => {
  return (
    <ControlledSelect
      name={name}
      label={label}
      required={required}
      width={width}
      errors={errors}
      control={control}
      options={options}
      defaultValue={defaultValue}
    />
  )
}
