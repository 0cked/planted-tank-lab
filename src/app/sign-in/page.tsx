import { redirect } from "next/navigation";

export default function SignInRedirectPage() {
  // Back-compat: older links / external references may point here.
  redirect("/login");
}
