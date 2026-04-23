export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] bg-book-dark animate-pulse flex items-center">
      <div className="absolute top-[30%] md:top-[40%] left-4 md:left-12 max-w-xl z-10 w-full">
        <div className="h-16 bg-book-card rounded w-3/4 mb-4"></div>
        <div className="h-6 bg-book-card rounded w-1/2 mb-6"></div>
        <div className="h-4 bg-book-card rounded w-full mb-2"></div>
        <div className="h-4 bg-book-card rounded w-full mb-2"></div>
        <div className="h-4 bg-book-card rounded w-4/5 mb-8"></div>
        <div className="flex gap-4">
          <div className="h-12 w-32 bg-book-card rounded"></div>
          <div className="h-12 w-40 bg-book-card rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="my-8 px-4 md:px-12">
      <div className="h-6 w-48 bg-book-card rounded mb-4 animate-pulse"></div>
      <div className="flex gap-2 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-none w-[120px] md:w-[200px] h-[180px] md:h-[300px] bg-book-card rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}
