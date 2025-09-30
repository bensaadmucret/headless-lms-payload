import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import React from 'react'
import { FieldWrapper } from '../shared/FieldWrapper'
export const Number: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
  }
> = ({ name, defaultValue, errors, label, register, required, width }) => {
  return (
    <FieldWrapper name={name} label={label} required={required} width={width} errors={errors}>
      <Input
        defaultValue={defaultValue}
        id={name}
        type="number"
        {...register(name, { required })}
      />
    </FieldWrapper>
  )
}
