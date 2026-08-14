export const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = {
      sm: { icon: 20, text: 16 },
      md: { icon: 28, text: 22 },
      lg: { icon: 36, text: 30 }
    }
  
    const s = sizes[size]
  
    return (
      <div className="flex items-center gap-2.5">
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 2L30 9V18C30 24.627 23.732 29.74 16 31C8.268 29.74 2 24.627 2 18V9L16 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 16.5L14 20.5L22 12.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ fontSize: s.text }} className="font-medium tracking-tight">
          Ledger
        </span>
      </div>
    )
}
  
export default Logo