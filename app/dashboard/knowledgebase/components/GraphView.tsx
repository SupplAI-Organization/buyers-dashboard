"use client";

import { useEffect, useMemo, useRef } from "react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import type { GraphNode, GraphEdge } from "@/lib/graph";

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
};

export default function GraphView({ nodes, edges, selectedId, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const onNodeClickRef = useRef(onNodeClick);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  const elements = useMemo<ElementDefinition[]>(() => {
    const degree: Record<string, number> = {};
    for (const n of nodes) degree[n.id] = 0;
    for (const e of edges) {
      degree[e.source] = (degree[e.source] ?? 0) + 1;
      degree[e.target] = (degree[e.target] ?? 0) + 1;
    }
    const nodeEls: ElementDefinition[] = nodes.map((n) => ({
      group: "nodes",
      data: {
        id: n.id,
        label: n.label,
        kind: n.kind,
        degree: degree[n.id] ?? 0,
        weight: n.weight ?? 1,
      },
    }));
    const edgeEls: ElementDefinition[] = edges.map((e) => ({
      group: "edges",
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight ?? 1,
        rawWeight: e.rawWeight ?? e.weight ?? 1,
      },
    }));
    return [...nodeEls, ...edgeEls];
  }, [nodes, edges]);

  // Domain of the edge-weight → visual mapping. A small floor avoids a
  // collapsed mapData range when every edge has weight 1.
  const maxEdgeWeight = useMemo(
    () => Math.max(2, ...edges.map((e) => e.weight ?? 1)),
    [edges],
  );

  // Mount cytoscape once. Re-runs only if elements identity changes
  // (which we deliberately scope by key={mode} from the parent).
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.15,
      // Don't auto-run layout in the constructor — we run it manually so we
      // can hold a reference and stop() it cleanly on unmount.
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#6b7a92",
            label: "data(label)",
            color: "#cbd5e1",
            "font-size": 8,
            "font-weight": 400,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 4,
            "text-opacity": 0,
            "min-zoomed-font-size": 4,
            width: "mapData(degree, 0, 10, 4, 12)",
            height: "mapData(degree, 0, 10, 4, 12)",
            "border-width": 0,
            "overlay-opacity": 0,
            "transition-property": "background-color, width, height, text-opacity",
            "transition-duration": 150,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: 'node[kind = "concept"]',
          style: { "background-color": "#94a3b8" },
        },
        {
          selector: 'node[kind = "seller"]',
          style: {
            "background-color": "#818cf8",
            width: "mapData(weight, 1, 20, 8, 22)",
            height: "mapData(weight, 1, 20, 8, 22)",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: 'node[kind = "product"]',
          style: { "background-color": "#34d399", width: 6, height: 6 },
        },
        {
          selector: 'node[kind = "category"]',
          style: {
            "background-color": "#fbbf24",
            "font-weight": 600,
            "font-size": 10,
            width: "mapData(weight, 1, 30, 12, 28)",
            height: "mapData(weight, 1, 30, 12, 28)",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: 'node[kind = "chat"]',
          style: {
            "background-color": "#f472b6", // pink — distinct from sellers/products/categories
            shape: "round-rectangle",
            "font-weight": 600,
            "font-size": 9,
            width: "mapData(weight, 1, 10, 10, 22)",
            height: "mapData(weight, 1, 10, 10, 22)",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: "node.is-hover",
          style: { "text-opacity": 1, color: "#f1f5f9" },
        },
        {
          selector: "node.is-selected",
          style: {
            "background-color": "#EA7B7B",
            "text-opacity": 1,
            color: "#fef2f2",
            "font-weight": 600,
          },
        },
        { selector: "node.is-dimmed", style: { opacity: 0.2 } },
        {
          selector: "edge",
          style: {
            width: `mapData(weight, 1, ${maxEdgeWeight}, 0.5, 3.5)`,
            opacity: `mapData(weight, 1, ${maxEdgeWeight}, 0.25, 0.85)`,
            "line-color": "#334155",
            "curve-style": "bezier",
            "target-arrow-shape": "none",
            "font-size": 8,
            color: "#cbd5e1",
            "text-opacity": 0,
            "text-background-color": "#0f172a",
            "text-background-opacity": 0.7,
            "text-background-padding": 2,
            "text-rotation": "autorotate",
            "transition-property": "line-color, opacity, width, text-opacity",
            "transition-duration": 150,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: "edge.is-incident",
          style: {
            "line-color": "#94a3b8",
            opacity: 1,
            width: `mapData(weight, 1, ${maxEdgeWeight}, 1, 5)`,
            label: "data(rawWeight)",
            "text-opacity": 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          selector: "edge.is-dimmed",
          style: { opacity: 0.06, "text-opacity": 0 },
        },
      ],
    });

    cyRef.current = cy;

    // Run layout manually so we can stop() it on unmount before destroy.
    // animate:false avoids an animation tick firing after destroy, which is
    // the source of the "reading 'notify'" crash under React strict mode.
    const layout = cy.layout({
      name: "cose",
      animate: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      idealEdgeLength: () => 240,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeRepulsion: () => 200000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edgeElasticity: () => 50,
      nestingFactor: 1.2,
      gravity: 0.05,
      componentSpacing: 120,
      numIter: 2500,
      initialTemp: 240,
      coolingFactor: 0.97,
      minTemp: 1.0,
      padding: 60,
      randomize: true,
      fit: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Defer layout to next tick so a synchronous strict-mode unmount
    // (which would call cleanup before the layout starts) can cancel it.
    queueMicrotask(() => {
      if (cancelled || cy.destroyed()) return;
      layout.run();
    });

    // Hover: highlight neighborhood, dim everything else
    const onOver = (evt: cytoscape.EventObject) => {
      if (cy.destroyed()) return;
      const node = evt.target;
      const neighborhood = node.closedNeighborhood();
      cy.elements().difference(neighborhood).addClass("is-dimmed");
      node.addClass("is-hover");
      node.connectedEdges().addClass("is-incident");
    };
    const onOut = (evt: cytoscape.EventObject) => {
      if (cy.destroyed()) return;
      const node = evt.target;
      cy.elements().removeClass("is-dimmed");
      node.removeClass("is-hover");
      cy.edges().removeClass("is-incident");
    };
    const onTap = (evt: cytoscape.EventObject) => {
      onNodeClickRef.current(evt.target.id());
    };

    cy.on("mouseover", "node", onOver);
    cy.on("mouseout", "node", onOut);
    cy.on("tap", "node", onTap);

    return () => {
      cancelled = true;
      try {
        layout.stop();
      } catch {
        /* layout never started or already stopped */
      }
      try {
        if (!cy.destroyed()) cy.destroy();
      } catch {
        /* already destroyed */
      }
      cyRef.current = null;
    };
  }, [elements, maxEdgeWeight]);

  // Reflect external selectedId onto the graph (no remount needed)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.nodes().removeClass("is-selected");
    if (selectedId) {
      cy.getElementById(selectedId).addClass("is-selected");
    }
  }, [selectedId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
