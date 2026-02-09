import { redirect } from "next/navigation";

export default function SignUpRedirectPage() {
  // For magic-link auth, "sign up" is the same flow as "sign in".
  redirect("/login");
}
