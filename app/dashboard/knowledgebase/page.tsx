import { loadGraph } from "@/lib/graph";
import KnowledgeBaseClient from "./components/KnowledgeBaseClient";

// Server Component: reads /content at request time and hands the parsed
// graph data down to the client wrapper. Keeping fs access on the server
// avoids bundling Node APIs into the browser build.
export default async function KnowledgeBasePage() {
  const data = await loadGraph();
  return <KnowledgeBaseClient data={data} />;
}
