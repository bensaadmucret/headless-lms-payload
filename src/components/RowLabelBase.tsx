"use client"
import React from 'react'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabelBase: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<any>()

  const label = data?.data?.link?.label
    ? `Nav item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.link?.label}`
    : 'Row'

  return <div>{label}</div>
}
