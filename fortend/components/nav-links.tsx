import Link from "next/link";

export default function NavLinks() {
  return (
    <>
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="text-xl font-bold">STORE</span>
      </Link>
    </>
  )
}