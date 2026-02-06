import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions } from "@/server/auth";

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "user";

  if (role !== "admin") notFound();

  return <>{props.children}</>;
}

