"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function NavItem({href, icon, children}: NavItemProps) {
  const pathname = usePathname();

  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      {icon}

      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>

      <ChevronRight className="ml-auto h-4 w-4 opacity-80"/>
    </Link>
  );
}