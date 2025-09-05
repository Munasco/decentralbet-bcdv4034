'use client';

import { redirect } from 'next/navigation';

export default function Page() {
  // Portfolio is not part of the MVP scope. Redirect to home.
  redirect('/');
  return null;
}
