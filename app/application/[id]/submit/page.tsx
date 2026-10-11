import { redirect } from "next/navigation";

// Old step-3 URL: submitting now happens on the application page.
export default async function SubmitPage({ params }: PageProps<"/application/[id]/submit">) {
  const { id } = await params;
  redirect(`/application/${id}`);
}
