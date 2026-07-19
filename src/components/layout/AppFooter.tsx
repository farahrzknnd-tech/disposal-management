import { Code2 } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t bg-background/80" aria-label="Application footer">
      <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:justify-end lg:px-8">
        <p className="inline-flex items-center gap-1.5">
          <span>Created by</span>
          <Code2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-medium text-foreground/80 transition-colors hover:text-primary">
            Farah Ananda &copy; 2026. All Rights Reserved.
          </span>
        </p>
      </div>
    </footer>
  );
}
