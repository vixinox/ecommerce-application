import Link from "next/link";

export default function NavLinks() {
  return (
    <>
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="text-xl font-bold">STORE</span>
      </Link>
      <nav className="hidden md:flex gap-6 mr-6">
        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
          首页
        </Link>
      </nav>
    </>
  )
}