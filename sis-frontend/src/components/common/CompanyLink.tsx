"use client";

import Link, { LinkProps } from "next/link";
import { useSearchParams } from "next/navigation";
import { urlWithCompany } from "@/lib/urlWithCompany";

type CompanyLinkProps = Omit<LinkProps, "href"> & {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  target?: string;
  rel?: string;
  preserveCompany?: boolean; // permite desabilitar se necessário
};

/**
 * CompanyLink - Link wrapper que preserva o query param `company` automaticamente
 */
export default function CompanyLink({
  href,
  children,
  className,
  onClick,
  target,
  rel,
  preserveCompany = true,
  ...linkProps
}: CompanyLinkProps) {
  const searchParams = useSearchParams();
  const companyId = searchParams?.get("company");
  
  const finalHref = preserveCompany && companyId 
    ? urlWithCompany(href, Number(companyId)) 
    : href;

  return (
    <Link
      {...linkProps}
      href={finalHref}
      className={className}
      onClick={onClick}
      target={target}
      rel={rel}
    >
      {children}
    </Link>
  );
}
