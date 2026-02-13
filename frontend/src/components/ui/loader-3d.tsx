import { cn } from '@/lib/utils';

interface Loader3DProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'cube' | 'orbit';
  className?: string;
}

const sizeMap = {
  sm: { container: 'h-6 w-6', inner: 'h-4 w-4', dot: 'h-1.5 w-1.5' },
  md: { container: 'h-10 w-10', inner: 'h-6 w-6', dot: 'h-2 w-2' },
  lg: { container: 'h-16 w-16', inner: 'h-10 w-10', dot: 'h-3 w-3' },
};

export const Loader3D = ({
  size = 'md',
  variant = 'spinner',
  className,
}: Loader3DProps) => {
  const sizes = sizeMap[size];

  if (variant === 'cube') {
    return (
      <div
        className={cn('inline-flex items-center justify-center', sizes.container, className)}
        style={{ perspective: '120px' }}
      >
        <div
          className={cn(
            sizes.inner,
            'animate-cube-spin rounded-sm'
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(38 92% 50%))',
            transformStyle: 'preserve-3d',
          }}
        />
      </div>
    );
  }

  if (variant === 'orbit') {
    return (
      <div className={cn('relative inline-flex items-center justify-center', sizes.container, className)}>
        {/* Center dot */}
        <div
          className={cn(sizes.dot, 'rounded-full absolute')}
          style={{
            background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(38 92% 50%))',
            opacity: 0.6,
          }}
        />
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 animate-orbit-dot"
            style={{ animationDelay: `${i * -0.533}s` }}
          >
            <div
              className={cn(sizes.dot, 'rounded-full')}
              style={{
                background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(38 92% 50%))',
                opacity: 1 - i * 0.25,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Default: spinner variant — rotating ring with 3D perspective
  return (
    <div
      className={cn('inline-flex items-center justify-center', sizes.container, className)}
      style={{ perspective: '120px' }}
    >
      <div
        className={cn(
          sizes.inner,
          'animate-rotate-3d rounded-sm'
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(38 92% 50%))',
        }}
      />
    </div>
  );
};
