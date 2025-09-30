import React from 'react'
import type { FieldErrorsImpl } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Width } from '../Width'
import { Error } from '../Error'

export type FieldWrapperProps = {
  name: string
  label?: string
  required?: boolean
  width?: unknown
  errors: Partial<FieldErrorsImpl>
  children: React.ReactNode
  labelProps?: React.ComponentProps<typeof Label>
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  name,
  label,
  required,
  width,
  errors,
  children,
  labelProps,
}) => {
  return (
    <Width width={width}>
      {label !== undefined && (
        <Label htmlFor={name} {...labelProps}>
          {label}
          {required && (
            <span className="required">
              * <span className="sr-only">(required)</span>
            </span>
          )}
        </Label>
      )}
      {children}
      {errors[name] && <Error name={name} />}
    </Width>
  )}
