import { Suspense } from "react";
import { loadGraph } from "@/lib/graph";
import KnowledgeBaseClient from "./components/KnowledgeBaseClient";

// Server Component: reads /content at request time and hands the parsed
// graph data down to the client wrapper. Keeping fs access on the server
// avoids bundling Node APIs into the browser build.
export default async function KnowledgeBasePage() {
  const data = await loadGraph();
  // The client uses useSearchParams() to deep-link agent citations
  // (?node=<id>). Next requires a Suspense boundary around any client tree
  // that reads search params, otherwise the static prerender bails.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#EA7B7B] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <KnowledgeBaseClient data={data} />
    </Suspense>
  );
}
