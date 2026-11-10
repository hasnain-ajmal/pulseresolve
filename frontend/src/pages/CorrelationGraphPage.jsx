import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Network, Sparkles, RefreshCw, ArrowLeft, Layers, Info } from 'lucide-react';
import { api } from '../api';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { LoadingState, ErrorState } from '../components/common/States';
import { AIPill } from '../components/common/AIBadge';

export function CorrelationGraphPage() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentsGraph();
      setGraphData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <LoadingState message="Rendering complaint-to-incident correlation topology..." />
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <ErrorState
          title="Failed to Load Correlation Graph"
          error={error}
          onRetry={fetchGraph}
        />
      </div>
    );
  }

  const { nodes = [], edges = [] } = graphData;
  const incidentNodes = nodes.filter(n => n.type === 'incident');
  const complaintNodes = nodes.filter(n => n.type === 'complaint');

  // SVG dimensions
  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;

  // Position incident nodes in an inner circle
  const incidentPositions = {};
  const incCount = incidentNodes.length || 1;
  incidentNodes.forEach((node, i) => {
    const angle = (i / incCount) * 2 * Math.PI - Math.PI / 2;
    const r = 140;
    incidentPositions[node.id] = {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      node
    };
  });

  // Position complaint nodes radiating near their linked incident
  const complaintPositions = {};
  complaintNodes.forEach((node, i) => {
    // Find edge connecting this complaint
    const edge = edges.find(e => e.source === node.id);
    if (edge && incidentPositions[edge.target]) {
      const targetPos = incidentPositions[edge.target];
      const offsetAngle = (i * 0.9) % (2 * Math.PI);
      const dist = 75 + (i % 3) * 15;
      complaintPositions[node.id] = {
        x: Math.max(30, Math.min(width - 30, targetPos.x + dist * Math.cos(offsetAngle))),
        y: Math.max(30, Math.min(height - 30, targetPos.y + dist * Math.sin(offsetAngle))),
        node,
        targetId: edge.target,
        score: edge.score || 0.8
      };
    } else {
      // Unlinked complaints placed along outer perimeter
      const angle = (i / (complaintNodes.length || 1)) * 2 * Math.PI;
      complaintPositions[node.id] = {
        x: centerX + 210 * Math.cos(angle),
        y: centerY + 210 * Math.sin(angle),
        node,
        targetId: null,
        score: 0
      };
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incident Correlation Topology</h1>
            <AIPill text="Semantic Graph" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual cluster mapping complaints (satellite dots) to high-level incidents (hub nodes). Click any node to inspect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchGraph} loading={loading}>
            Refresh Graph
          </Button>
        </div>
      </div>

      {/* Graph Visualizer Canvas */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-300"></span>
                Incident Hub
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-200"></span>
                Linked Complaint
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                Unlinked Report
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {incidentNodes.length} incidents &bull; {complaintNodes.length} complaints &bull; {edges.length} semantic edges
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0 bg-slate-950 flex flex-col items-center justify-center relative min-h-[500px]">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-auto max-h-[600px] select-none"
          >
            {/* Semantic Edges */}
            {edges.map((edge, idx) => {
              const srcPos = complaintPositions[edge.source];
              const tgtPos = incidentPositions[edge.target];
              if (!srcPos || !tgtPos) return null;
              const opacity = Math.max(0.25, Math.min(0.9, edge.score || 0.8));
              return (
                <line
                  key={`edge-${idx}`}
                  x1={srcPos.x}
                  y1={srcPos.y}
                  x2={tgtPos.x}
                  y2={tgtPos.y}
                  stroke="#a855f7"
                  strokeWidth={edge.score > 0.85 ? 1.75 : 1}
                  strokeOpacity={opacity}
                  strokeDasharray={edge.score > 0.85 ? "none" : "3,3"}
                />
              );
            })}

            {/* Complaint Nodes */}
            {Object.entries(complaintPositions).map(([id, pos]) => {
              const isSelected = selectedNode?.id === id;
              const isLinked = Boolean(pos.targetId);
              return (
                <g 
                  key={id} 
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => setSelectedNode(pos.node)}
                  className="cursor-pointer group"
                >
                  <circle
                    r={isSelected ? 7 : isLinked ? 5 : 3.5}
                    fill={isLinked ? '#38bdf8' : '#64748b'}
                    stroke={isSelected ? '#ffffff' : '#0f172a'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-all hover:scale-150"
                  />
                  <text
                    y={-8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={8}
                    fontFamily="monospace"
                    className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  >
                    #{pos.node.id}
                  </text>
                </g>
              );
            })}

            {/* Incident Nodes (Hubs) */}
            {Object.entries(incidentPositions).map(([id, pos]) => {
              const inc = pos.node;
              const isSelected = selectedNode?.id === id;
              return (
                <g 
                  key={id} 
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => {
                    setSelectedNode(inc);
                  }}
                  onDoubleClick={() => {
                    const rawId = inc.id.replace('i', '');
                    navigate(`/incidents/${rawId}`);
                  }}
                  className="cursor-pointer group"
                >
                  <circle
                    r={24}
                    fill="#581c87"
                    stroke="#c084fc"
                    strokeWidth={isSelected ? 3 : 1.5}
                    className="transition-all hover:scale-110 shadow-lg"
                  />
                  <text
                    y={-3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    INC-{inc.id.replace('i', '')}
                  </text>
                  <text
                    y={9}
                    textAnchor="middle"
                    fill="#e9d5ff"
                    fontSize={7.5}
                    fontFamily="sans-serif"
                  >
                    {inc.label?.split(':')[0] || 'Service'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Details Overlay */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-slate-900/95 border border-slate-700/80 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs text-slate-200 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400">
                    {selectedNode.type === 'incident' ? 'Incident Cluster Node' : 'Complaint Telemetry Node'}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    {selectedNode.type === 'incident' ? `INC-${selectedNode.id.replace('i', '')}: ${selectedNode.title || selectedNode.label}` : `Ticket #${selectedNode.id.replace('c', '')}`}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white p-0.5"
                >
                  &times;
                </button>
              </div>

              {selectedNode.type === 'incident' ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Status: {selectedNode.status}</span>
                    <span className="text-[11px] text-slate-400">&bull; Priority: {selectedNode.priority}</span>
                  </div>
                  <Button
                    variant="brand"
                    size="sm"
                    className="w-full text-xs mt-2"
                    onClick={() => navigate(`/incidents/${selectedNode.id.replace('i', '')}`)}
                  >
                    Open Incident Investigation &rarr;
                  </Button>
                </div>
              ) : (
                <div className="mt-2 text-slate-300">
                  <p>Customer: {selectedNode.customer || 'Unknown'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Category: {selectedNode.category} &bull; Sentiment: {selectedNode.sentiment}</p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
