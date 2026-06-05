import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

async function bootstrap() {
  const nodeEnv =
    (typeof process !== "undefined" ? process.env.NODE_ENV : undefined) ??
    import.meta.env.MODE;

  if (nodeEnv !== "production") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: {
        url: "/mockServiceWorker.js"
      }
    });
  }

  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
}

void bootstrap();
