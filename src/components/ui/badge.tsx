import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    
    const variantStyles = {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground", 
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      outline: "text-foreground"
    }

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`.trim()

    return (
      <div
        ref={ref}
        className={combinedClassName}
        style={{
          backgroundColor: variant === 'default' ? '#3b82f6' : 
                          variant === 'secondary' ? '#6b7280' :
                          variant === 'destructive' ? '#ef4444' : 'transparent',
          color: variant === 'outline' ? 'inherit' : 'white',
          border: variant === 'outline' ? '1px solid #d1d5db' : 'none',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600'
        }}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export { Badge }