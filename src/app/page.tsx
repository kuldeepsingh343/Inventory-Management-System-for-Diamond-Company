import { redirect } from "next/navigation";

export default function Home() {
  // Root page redirects into the dashboard layout which renders
  // the (dashboard)/page.tsx (the actual dashboard).
  // The middleware already guards unauthenticated access, so
  // by the time we reach here the user is logged in.
  redirect("/");
}
