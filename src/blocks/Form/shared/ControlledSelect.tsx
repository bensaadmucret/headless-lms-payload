import React from 'react'
import type { Control, FieldErrorsImpl } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import {
  Select as SelectComponent,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldWrapper } from './FieldWrapper'

export type Option = { label: string; value: string }

export type ControlledSelectProps = {
  name: string
  label?: string
  required?: boolean
  width?: unknown
  errors: Partial<FieldErrorsImpl>
  control: Control
  options: Option[]
  defaultValue?: string
  labelProps?: React.ComponentProps<'label'>
}

export const ControlledSelect: React.FC<ControlledSelectProps> = ({
  name,
  label,
  required,
  width,
  errors,
  control,
  options,
  defaultValue,
  labelProps,
}) => {
  return (
    <FieldWrapper name={name} label={label} required={required} width={width} errors={errors} labelProps={labelProps}>
      <Controller
        control={control}
        defaultValue={defaultValue ?? ''}
        name={name}
        render={({ field: { onChange, value } }) => {
          const controlledValue = options.find((t) => t.value === value)

          return (
            <SelectComponent onValueChange={(val) => onChange(val)} value={controlledValue?.value}>
              <SelectTrigger className="w-full" id={name}>
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent>
                {options.map(({ label, value }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectComponent>
          )
        }}
        rules={{ required }}
      />
    </FieldWrapper>
  )
}
