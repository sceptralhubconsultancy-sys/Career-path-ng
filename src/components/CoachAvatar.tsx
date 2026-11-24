interface CoachAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CoachAvatar({ size = 'md', className = '' }: CoachAvatarProps) {
  const dimensions =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div
      className={`${dimensions} ${className} rounded-full bg-[#0F766E]/10 border border-[#0F766E]/20 flex items-center justify-center shrink-0 overflow-hidden`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <rect width="64" height="64" fill="#F0F7F6" />
        {/* Warm shoulder silhouette */}
        <path
          d="M12 64C12 50.7452 20.9543 42 32 42C43.0457 42 52 50.7452 52 64"
          fill="#0F766E"
        />
        {/* Collar accent */}
        <path
          d="M26 43L32 50L38 43"
          stroke="#FAFAF7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Head */}
        <circle cx="32" cy="26" r="11" fill="#E8C7A8" />
        {/* Hair */}
        <path
          d="M21 25C21 17.5 25.8 13.5 32 13.5C38.2 13.5 43 17.5 43 25C41 21 37.5 19.5 32 19.5C26.5 19.5 23 21 21 25Z"
          fill="#292524"
        />
        {/* Calm smile */}
        <path
          d="M28.5 29.5C29.5 30.8 30.7 31.3 32 31.3C33.3 31.3 34.5 30.8 35.5 29.5"
          stroke="#44403C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Eyes */}
        <circle cx="28.2" cy="25.2" r="1.2" fill="#292524" />
        <circle cx="35.8" cy="25.2" r="1.2" fill="#292524" />
      </svg>
    </div>
  );
}
