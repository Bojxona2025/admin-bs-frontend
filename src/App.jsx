import { useEffect } from "react";
import { Router } from "./routes/Router";

function App() {
  useEffect(() => {
    const optimizeImage = (img) => {
      if (img.dataset.priority === "high") {
        img.loading = "eager";
        img.fetchPriority = "high";
      } else if (!img.hasAttribute("loading")) {
        img.loading = "lazy";
      }

      if (!img.hasAttribute("decoding")) {
        img.decoding = "async";
      }

      if (!img.hasAttribute("fetchpriority") && img.loading !== "eager") {
        img.fetchPriority = "low";
      }
    };

    document.querySelectorAll("img").forEach(optimizeImage);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          if (node.tagName === "IMG") {
            optimizeImage(node);
            continue;
          }

          node.querySelectorAll?.("img").forEach(optimizeImage);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Router />
    </>
  );
}

export default App;
