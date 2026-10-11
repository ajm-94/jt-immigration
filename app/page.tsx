import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

export default async function Home({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.role === "staff" ? "/admin" : "/portal");
  const { link } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-lg text-navy">
        {link === "expired" ? "This link no longer works. Please ask JT Immigration for a new one." : "Open the link JT Immigration sent you."}
      </p>
    </div>
  );
}
