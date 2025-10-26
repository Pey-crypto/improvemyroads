import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-foreground/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            © {year} Improve My City
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="hover:underline underline-offset-4">About</Link>
            <Link href="/privacy" className="hover:underline underline-offset-4">Privacy</Link>
            <Link href="/terms" className="hover:underline underline-offset-4">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
