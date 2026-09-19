import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {routing} from './shared/i18n/routing';
const handle = createMiddleware(routing);
export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/') {
    const saved = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = routing.locales.find(value => value === saved) ?? 'ar';
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }
  return handle(request);
}
export const config = {matcher: ['/((?!api|_next|.*\\..*).*)']};
