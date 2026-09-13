type BrandMarkProps = {
  size?: number;
  wordmark?: boolean;
  className?: string;
};

/** First-pass scalable identity: a catalog card containing the character 谷. */
export function BrandMark({
  size = 36,
  wordmark = false,
  className,
}: BrandMarkProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <svg aria-hidden="true" height={size} viewBox="0 0 40 40" width={size}>
        <rect fill="#b93c49" height="36" rx="11" width="30" x="5" y="2" />
        <rect
          fill="none"
          height="29"
          opacity=".5"
          rx="8"
          stroke="white"
          width="23"
          x="8.5"
          y="5.5"
        />
        <text
          fill="white"
          fontFamily="system-ui, sans-serif"
          fontSize="18"
          fontWeight="750"
          textAnchor="middle"
          x="20"
          y="26"
        >
          谷
        </text>
        <circle cx="31" cy="8" fill="#d6ad72" r="3" />
      </svg>
      {wordmark ? (
        <span style={{ fontSize: size * 0.48, fontWeight: 750, lineHeight: 1 }}>
          谷布谷
        </span>
      ) : null}
    </span>
  );
}
