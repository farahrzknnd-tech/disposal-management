import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-white py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      <p className="text-xs text-muted-foreground">Halaman ini akan segera tersedia.</p>
    </div>
  );
}
