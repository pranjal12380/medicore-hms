import { Github, Linkedin } from "lucide-react";

const AUTHOR = {
  name: "Pranjal Kankal",
  github: "https://github.com/pranjal12380",
  linkedin: "https://www.linkedin.com/in/pranjal-kankal/",
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} MediCore. Built by{" "}
          <span className="font-medium text-foreground">{AUTHOR.name}</span>.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={AUTHOR.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </a>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
