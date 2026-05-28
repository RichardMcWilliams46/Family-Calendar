interface SunflowerProps {
  className?: string;
  size?: number;
}

export default function Sunflower({ className = '', size = 80 }: SunflowerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(50, 50)">
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x = Math.cos(angle) * 28;
          const y = Math.sin(angle) * 28;
          const rotation = i * 30;
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="12"
              ry="6"
              fill="#F59E0B"
              transform={`rotate(${rotation} ${x} ${y})`}
              opacity="0.95"
            />
          );
        })}

        <circle cx="0" cy="0" r="18" fill="#78350F" opacity="0.9" />

        {[...Array(20)].map((_, i) => {
          const angle = (i * 18 * Math.PI) / 180;
          const x = Math.cos(angle) * 12;
          const y = Math.sin(angle) * 12;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill="#92400E"
              opacity="0.7"
            />
          );
        })}

        <circle cx="0" cy="0" r="8" fill="#451A03" opacity="0.3" />
      </g>
    </svg>
  );
}
