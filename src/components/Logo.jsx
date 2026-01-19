// Logo CFlow - C Notch Gradient - Variação 1
const Logo = ({ className = 'w-10 h-10', showText = true, size = 40 }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Logo SVG - C Notch Gradient */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        className={className}
      >
        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="56" y2="56">
            <stop stopColor="#0a4ee4"/>
            <stop offset="1" stopColor="#7c3aed"/>
          </linearGradient>
          <linearGradient id="logo-notch" x1="34" y1="25" x2="48" y2="33">
            <stop stopColor="#0a4ee4"/>
            <stop offset="1" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect width="56" height="56" rx="14" fill="url(#logo-bg)"/>
        <path
          d="M38 18C32 13 22 13 16 18C10 24 10 34 16 40C22 46 32 46 38 40"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect x="34" y="25" width="14" height="8" rx="4" fill="url(#logo-notch)"/>
      </svg>

      {/* Texto CFlow */}
      {showText && (
        <span
          className="text-xl font-extrabold"
          style={{
            background: 'linear-gradient(135deg, #0a4ee4, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          cflow
        </span>
      )}
    </div>
  );
};

export default Logo;
