import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'avatar' | 'card' | 'line';
  count?: number;
  width?: string;
  height?: string;
}

function Skeleton({ 
  className,
  variant = 'default',
  count = 1,
  width = '100%',
  height = '20px',
  ...props 
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const baseClass = "skeleton rounded-lg bg-muted";
  
  const variantClasses: Record<string, string> = {
    default: "w-full h-12",
    text: "h-4 w-3/4",
    avatar: "h-12 w-12 rounded-full",
    card: "w-full h-48",
    line: "h-2 w-full",
  };

  const skeletons = Array.from({ length: count });

  if (count > 1) {
    return (
      <div className="space-y-3">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, variantClasses[variant], className)}
            style={{ width, height }}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, variantClasses[variant], className)}
      style={{ width, height }}
      {...props}
    />
  );
}

// Skeleton components for specific UI patterns
function CardSkeleton() {
  return (
    <div className="card-glass p-6 space-y-4 animate-pulse">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="line" />
      <Skeleton variant="line" />
      <div className="flex gap-2">
        <Skeleton variant="line" width="40%" />
        <Skeleton variant="line" width="30%" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex gap-4 py-4 px-6 border-b">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="line" />
      </div>
      <Skeleton width="100px" height="32px" />
    </div>
  );
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, CardSkeleton, TableRowSkeleton, ListSkeleton }
