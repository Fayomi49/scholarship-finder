import "server-only";
import { redirect } from "next/navigation";
import { requireOwner, AccessError } from "./owner";

export async function pageOwner() {
  try {
    return await requireOwner();
  } catch (error) {
    if (error instanceof AccessError) redirect("/sign-in");
    throw error;
  }
}
