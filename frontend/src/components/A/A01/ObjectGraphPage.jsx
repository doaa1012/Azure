import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Network } from "vis-network/standalone";
import config from "../../../config_path";
import { Link } from "react-router-dom";
const ObjectGraphPage = () => {
  const { objectnameurl } = useParams();
  const networkRef = useRef(null);
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [error, setError] = useState(null);
  const [measurementDetails, setMeasurementDetails] = useState({});
  const [openMeasurementGroup, setOpenMeasurementGroup] = useState(null);
  const container = networkRef.current;
  const expandedObjects = new Set();
  const newMeasurementGroups = { ...measurementDetails };

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch(`${config.BASE_URL}api/object/graph/${objectnameurl}/`);
        if (!response.ok) throw new Error("Failed to fetch graph data");
        const data = await response.json();

        if (!data.main_object || !data.other_objects) {
          throw new Error("Invalid API response");
        }

        const nodes = [
          {
            id: data.main_object.objectid,
            label: data.main_object.name || "Unknown",
            color: "#ff5733",
            font: { color: "#fff", size: 18, bold: true },
          },
        ];
        const edges = [];
        const measurementGroups = {}; // Group measurements by rubric

        // ✅ Group measurement areas by rubric
        data.grouped_measurements.forEach((measurement) => {
          const rubricName = measurement.rubric_name;
          if (!measurementGroups[rubricName]) {
            measurementGroups[rubricName] = {
              id: `measurement-group-${rubricName}`,
              label: `${rubricName} (${measurement.count})`,
              objects: [],
            };
          }
          measurementGroups[rubricName].objects.push(...measurement.objects);
        });

        Object.values(measurementGroups).forEach((group) => {
          nodes.push({
            id: group.id,
            label: group.label,
            color: "#f39c12",
            font: { color: "#fff", size: 16, bold: true },
          });

          edges.push({
            from: data.main_object.objectid,
            to: group.id,
            color: "#e67e22",
            arrows: "to",
          });
        });

        // ✅ Add other objects
        data.other_objects.forEach((obj, index) => {
          const nodeId = `object-${obj.objectid}`;

          nodes.push({
            id: nodeId,
            label: `${obj.name || "Unnamed Object"}`,
          

            color: obj.direction === "reverse" ? "#8e44ad" : index % 2 === 0 ? "#3498db" : "#27ae60",
            font: { color: "#fff", size: 14 },
            url: `/object/${obj.objectid}`
          });

          edges.push({
            from: obj.direction === "reverse" ? nodeId : data.main_object.objectid,
            to: obj.direction === "reverse" ? data.main_object.objectid : nodeId,
            color: "#7f8c8d",
            arrows: "to",
          });
        });

        setGraphData({ nodes, edges });
        setMeasurementDetails(measurementGroups);
      } catch (err) {
        console.error("Error fetching graph data:", err);
        setError(err.message);
      }
    };

    fetchGraphData();
  }, [objectnameurl]);

  useEffect(() => {
  if (networkRef.current && graphData.nodes.length > 0) {
    const container = networkRef.current;
    const network = new Network(container, graphData, {
      layout: {
        improvedLayout: true,
        hierarchical: false,
      },
      physics: {
        enabled: true,
        solver: "repulsion",
        repulsion: {
          centralGravity: 0.2,
          springLength: 200,
          springConstant: 0.01,
          nodeDistance: 150,
          damping: 0.09,
        },
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
      },
      nodes: {
        shape: "ellipse",
        borderWidth: 2,
      },
      edges: {
        arrows: "to",
        smooth: true,
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
      },
    });
    

    // Tooltip on hover
    network.on("hoverNode", () => {
      container.title = "Left-click: View • Right-click: Expand";
      container.style.cursor = "pointer";
    });

    // Left-click handler
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];

        // Toggle measurement group
        if (clickedNodeId.startsWith("measurement-group-")) {
          setOpenMeasurementGroup((prev) =>
            prev === clickedNodeId ? null : clickedNodeId
          );
          return;
        }

        // Navigate to object detail
        const allNodes = network.body.data.nodes.get();
        const clickedNode = allNodes.find((node) => node.id === clickedNodeId);

        if (clickedNode && clickedNode.url) {
          navigate(clickedNode.url);
        }
      }
    });

    // Expandable node tracking
    const expandedObjects = new Set();

    // Right-click expand handler
    const handleRightClick = async (event) => {
      event.preventDefault();

      const canvasPosition = { x: event.offsetX, y: event.offsetY };
      const nodeId = network.getNodeAt(canvasPosition);

      if (!nodeId || !nodeId.toString().startsWith("object-")) return;
      if (expandedObjects.has(nodeId)) return;

      const objectId = nodeId.replace("object-", "");

      try {
        const response = await fetch(`${config.BASE_URL}api/object/expand/${objectId}/`);
        if (!response.ok) throw new Error("Failed to expand object");

        const data = await response.json();
        const newNodes = [];
        const newEdges = [];
        const currentNodeIds = new Set(network.body.data.nodes.getIds());
        const currentEdges = network.body.data.edges.get();

        data.expanded_nodes.forEach((obj) => {
          if (!currentNodeIds.has(obj.id)) {
            newNodes.push({
              id: obj.id,
              label: `${obj.name || "Unnamed"}`,
              color: obj.direction === "reverse" ? "#8e44ad" : "#1abc9c",
              font: { color: "#fff", size: 14 },
              url: `/object/${obj.id.replace("object-", "")}`,
            });
          }
        });

        data.expanded_edges.forEach((edge) => {
          const exists = currentEdges.some((e) => e.from === edge.from && e.to === edge.to);
          if (!exists) {
            newEdges.push({
              from: edge.from,
              to: edge.to,
              arrows: "to",
              color: "#95a5a6",
            });
          }
        });

        network.body.data.nodes.add(newNodes);
        network.body.data.edges.add(newEdges);
        expandedObjects.add(nodeId);
      } catch (err) {
        console.error("Expand error:", err);
      }
    };

    // Attach right-click handler
    container.addEventListener("contextmenu", handleRightClick);

    // Cleanup on unmount
    return () => {
      container.removeEventListener("contextmenu", handleRightClick);
    };
  }
}, [graphData, navigate, openMeasurementGroup]);


  if (error) return <p className="text-red-500 text-center mt-5">Error loading graph: {error}</p>;

  return (
    <div className="graph-page bg-gradient-to-b from-blue-50 to-blue-100 min-h-screen p-8 flex flex-col items-center">
     <div className="w-full max-w-6xl mb-4">
  {/* Title */}
  <h1 className="text-3xl font-bold text-gray-800 mb-3">
    Graph for:{" "}
    <span className="text-blue-600 break-words">{graphData.nodes[0]?.label || "Loading..."}</span>

  </h1>

  {/* Download Button */}
  <div className="mb-4">
    <a
      href={`${config.BASE_URL}api/object/graph/download/${objectnameurl}/`}
      className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md shadow transition duration-200"
      download
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download JSON
    </a>
  </div>
</div>


      {/* Graph Section */}
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-md border border-blue-500 p-4">
        <div ref={networkRef} className="w-full h-[600px]"></div>
      </div>

      {/* Measurement Details Section */}
      {Object.entries(measurementDetails).map(([rubricName, group]) => (
        <div key={group.id} className="w-full max-w-4xl mt-6">
          <h2
            className="flex justify-between items-center p-4 text-lg font-semibold text-blue-600 bg-blue-200 rounded-lg cursor-pointer hover:bg-blue-300"
            onClick={() =>
              setOpenMeasurementGroup(openMeasurementGroup === group.id ? null : group.id)
            }
          >
            {rubricName} ({group.objects.length})
          </h2>

          {openMeasurementGroup === group.id && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {group.objects.map((obj) => (
                <div
                  key={obj.objectid}
                  className="p-4 bg-white rounded-lg shadow-md border-l-4 border-blue-400 hover:shadow-lg"
                >
                  <h3 className="text-lg font-semibold text-blue-600">
                    <Link
                      to={`/object/${obj.objectid}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {obj.name || "Unknown Measurement"}
                    </Link>
                  </h3>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ObjectGraphPage;
