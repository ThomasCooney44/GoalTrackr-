import { redirect } from 'next/navigation';

// Root: redirect to dashboard (middleware handles unauthed → /login)
export default function Home() {
  redirect('/dashboard');
}
