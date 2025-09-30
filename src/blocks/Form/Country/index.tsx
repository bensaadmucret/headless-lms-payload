import type { CountryField } from '@payloadcms/plugin-form-builder/types'
import type { Control, FieldErrorsImpl } from 'react-hook-form'

import React from 'react'
import { ControlledSelect } from '../shared/ControlledSelect'
import { countryOptions } from './options'

export const Country: React.FC<
  CountryField & {
    control: Control
    errors: Partial<FieldErrorsImpl>
  }
> = ({ name, control, errors, label, required, width }) => {
  return (
    <ControlledSelect
      name={name}
      label={label}
      required={required}
      width={width}
      errors={errors}
      control={control}
      options={countryOptions}
      defaultValue={''}
    />
  )
}
