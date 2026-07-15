"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@mui/material";

export default function Home() {
  const [result, setResult] = useState<string>("Loading...");
  const { data: session } = authClient.useSession();

  useEffect(() => {
    fetch("/api/ping")
      .then(async (res) => {
        const data = await res.json();
        setResult(JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        setResult(`Error: ${err.message}`);
      });
  }, []);

  return (
    <div className="p-8">
      {!session && (
        <Button
          onClick={() => authClient.signIn.social({ provider: "github" })}
          variant="contained"
          sx={{ textTransform: "none" }}
        >
          Sign in with GitHub
        </Button>
      )}
      {session && (
        <Button onClick={() => authClient.signOut()} variant="outlined">
          Sign Out
        </Button>
      )}
      <div className="mb-4">
        /ping:
        <pre>{result}</pre>
      </div>
    </div>
  );
}
