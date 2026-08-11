"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@mui/material";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Header() {
  const { data: session } = authClient.useSession();

  return (
    <header className="h-10 shrink-0 flex justify-between items-center px-4 border-b border-divider text-sm font-medium">
      <div className="flex gap-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/table" className="hover:underline">
          Table
        </Link>
        {session && (
          <Link href="/settings" className="hover:underline">
            Settings
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session ? (
          <Button variant="text" size="small" onClick={() => authClient.signOut()}>
            Sign out
          </Button>
        ) : (
          <Button
            variant="text"
            size="small"
            onClick={() =>
              authClient.signIn.social({ provider: "github", callbackURL: "/" })
            }
          >
            Sign in
          </Button>
        )}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
