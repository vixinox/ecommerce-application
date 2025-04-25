export default function SiteFooter() {
  return (
    <footer className="border-t py-6 md:py-8 w-full mx-auto">
      <div className="container flex flex-col gap-4 md:flex-row md:items-center">
        <p className="text-sm text-muted-foreground ml-20">
          © {new Date().getFullYear()} 电商网站，不保留所有权力
        </p>
      </div>
    </footer>
  )
}