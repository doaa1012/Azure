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
  const [mainObject, setMainObject] = useState(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch(`${config.BASE_URL}api/object/graph/${objectnameurl}/`);
        if (!response.ok) throw new Error("Failed to fetch graph data");
        const data = await response.json();
        setMainObject(data.main_object);
        if (!data.main_object || !data.other_objects) {
          throw new Error("Invalid API response");
        }
        
        const nodes = [
          {
            id: data.main_object.objectid,
            label: data.main_object.objectname || "Unknown",

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
            label: `${obj.name || "Unnamed Object"} (${obj.direction})`,
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
      const network = new Network(networkRef.current, graphData, {
        nodes: { shape: "ellipse", borderWidth: 2 },
        edges: { arrows: "to", smooth: true },
        physics: { stabilization: { enabled: true, } },
        interaction: { dragNodes: true },
        configure: { enabled: true }
      });

      network.on("click", (params) => {
        if (params.nodes.length > 0) {
          const clickedNodeId = params.nodes[0];

          // ✅ Open measurement details
          if (clickedNodeId.startsWith("measurement-group-")) {
            setOpenMeasurementGroup(
              openMeasurementGroup === clickedNodeId ? null : clickedNodeId
            );
          }

          // ✅ Navigate to object details
          const clickedNode = graphData.nodes.find(node => node.id === clickedNodeId);
          if (clickedNode && clickedNode.url) {
            window.open(clickedNode.url, '_blank');
          }
        }
      });
    }
  }, [graphData, navigate, openMeasurementGroup]);

  if (error) return <p className="text-red-500 text-center mt-5">Error loading graph: {error}</p>;

  return (
    <div className="graph-page bg-gradient-to-b from-blue-50 to-blue-100 min-h-screen p-8 flex flex-col items-center">
    {mainObject ? (
  <>
    <h1 className="text-3xl font-bold text-gray-800 mb-6">
      Graph for:{" "}
      <span className="text-blue-600 break-words">
        {mainObject.objectname.toUpperCase()}
      </span>
    </h1>

    {/* Graph Section + rest of your JSX */}
  </>
) : (
  <p className="text-lg text-gray-500">Loading main object...</p>
)}




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
                      target="_blank"
                      rel="noopener noreferrer"
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

