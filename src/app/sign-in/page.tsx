import { Button } from "@/components/ui/button";
import { authConfigured } from "@/server/env";
import { signIn } from "@/server/auth";

export const dynamic = "force-dynamic";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = authConfigured();
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-serif text-4xl">
        Your personal scholarship workspace
      </h1>
      <p className="mt-5 mb-6 leading-7 text-muted-foreground">
        Sign in with your personal GitHub account. Access is restricted to the
        workspace owner.
      </p>
      {error && (
        <p role="alert" className="mb-5">
          Sign-in could not be completed. Use your authorized personal account
          and try again.
        </p>
      )}
      {configured ? (
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit">Sign in with personal GitHub</Button>
        </form>
      ) : (
        <p
          role="status"
          className="rounded-xl border border-border bg-card p-5"
        >
          Sign-in is not configured yet. Follow the personal GitHub OAuth setup
          in README.md.
        </p>
      )}
    </div>
  );
}
