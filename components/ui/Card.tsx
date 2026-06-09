interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`border border-divider bg-surface p-6 ${
        hover ? "transition-shadow duration-200 hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
