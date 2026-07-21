// components/CompanyRedirectHandler.tsx
'use client';
import { useCompanyStore } from '@/stores/CompanyStore';
import { redirect, usePathname } from 'next/navigation';

const ALLOWED_ROUTES = ['/login', '/register', '/ajustes', '/sistema', '/acceso_publico', '/not-authorized'];

export const RedirectHandler = () => {
  const pathname = usePathname();
  const { selectedCompany, selectedStation } = useCompanyStore();

  if (selectedCompany && selectedStation) {
    const isAllowedRoute = ALLOWED_ROUTES.some((route) => pathname.startsWith(route));
    const isOnCompanyRoute = pathname.startsWith(`/${selectedCompany.slug}/`);

    if (!isAllowedRoute && !isOnCompanyRoute) {
      redirect(`/${selectedCompany.slug}/dashboard`);
    }
  }

  return null;
};
