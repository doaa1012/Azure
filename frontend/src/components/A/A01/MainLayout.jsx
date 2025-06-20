import { Outlet, Link } from "react-router-dom";
import { useState } from "react";
import Navbar from './NavBar';
import ChatbotComponent from "../../ChatbotComponent";
import logo from '../../images/crc1625logo200.png';

const MainLayout = () => {
  const [isAreaACollapsed, setIsAreaACollapsed] = useState(true);
  const [isAreaBCollapsed, setIsAreaBCollapsed] = useState(true);
  const [isAreaCCollapsed, setIsAreaCCollapsed] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  const toggleAreaA = (e) => {
    e.preventDefault();
    setIsAreaACollapsed(!isAreaACollapsed);
  };

  const toggleAreaB = (e) => {
    e.preventDefault();
    setIsAreaBCollapsed(!isAreaBCollapsed);
  };

  const toggleAreaC = (e) => {
    e.preventDefault();
    setIsAreaCCollapsed(!isAreaCCollapsed);
  };
  const handleAddContainer = async () => {
    const token = localStorage.getItem('token');
    const newRubric = {
      name: "INF",
      rubric_name: "INF",
      tenant_id: 4,
      access_control: "public"
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/create_rubric/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newRubric)
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Container '${newRubric.name}' created successfully!`);
        // optionally reload or update the sidebar
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to create rubric:", error);
      alert("An error occurred while creating the container.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <button
        className="absolute top-4 left-4 z-50 md:hidden bg-blue-600 text-white p-2 rounded-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "✖" : "☰"}
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 top-0 left-0 h-full w-64 bg-white shadow-lg p-6 overflow-y-auto transform transition-transform duration-300
      ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}
      >
        <nav className="flex-grow">
          <ul className="space-y-6">
            {/* Area A */}
            <li>
              <div className="flex justify-between items-center">
                <Link to="/area-a" className="p-3 rounded-lg w-full text-gray-700 bg-blue-100 hover:bg-blue-200 transition-colors">
                  Area A
                </Link>
                <button
                  onClick={toggleAreaA}
                  className="ml-2 text-sm p-1 rounded-lg bg-blue-300 text-white hover:bg-blue-400 transition"
                >
                  {isAreaACollapsed ? "+" : "-"}
                </button>
              </div>
              {!isAreaACollapsed && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link to="/a01" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A01
                    </Link>
                  </li>
                  <li>
                    <Link to="/a02" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A02
                    </Link>
                  </li>
                  <li>
                    <Link to="/a03" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A03
                    </Link>
                  </li>
                  <li>
                    <Link to="/a04" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A04
                    </Link>
                  </li>
                  <li>
                    <Link to="/a05" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A05
                    </Link>
                  </li>
                  <li>
                    <Link to="/a06" className="p-2 rounded-lg block text-gray-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                      A06
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Area B */}
            <li>
              <div className="flex justify-between items-center">
                <Link to="/area-b" className="p-3 rounded-lg w-full text-gray-700 bg-teal-100 hover:bg-teal-200 transition-colors">
                  Area B
                </Link>
                <button
                  onClick={toggleAreaB}
                  className="ml-2 text-sm p-1 rounded-lg bg-teal-300 text-white hover:bg-teal-400 transition"
                >
                  {isAreaBCollapsed ? "+" : "-"}
                </button>
              </div>
              {!isAreaBCollapsed && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link to="/b01" className="p-2 rounded-lg block text-gray-600 bg-teal-50 hover:bg-teal-100 transition-colors">
                      B01
                    </Link>
                  </li>
                  <li>
                    <Link to="/b02" className="p-2 rounded-lg block text-gray-600 bg-teal-50 hover:bg-teal-100 transition-colors">
                      B02
                    </Link>
                  </li>
                  <li>
                    <Link to="/b03" className="p-2 rounded-lg block text-gray-600 bg-teal-50 hover:bg-teal-100 transition-colors">
                      B03
                    </Link>
                  </li>
                  <li>
                    <Link to="/b04" className="p-2 rounded-lg block text-gray-600 bg-teal-50 hover:bg-teal-100 transition-colors">
                      B04
                    </Link>
                  </li>
                  <li>
                    <Link to="/b05" className="p-2 rounded-lg block text-gray-600 bg-teal-50 hover:bg-teal-100 transition-colors">
                      B05
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Area C */}
            <li>
              <div className="flex justify-between items-center">
                <Link to="/area-c" className="p-3 rounded-lg w-full text-gray-700 bg-amber-100 hover:bg-amber-200 transition-colors">
                  Area C
                </Link>
                <button
                  onClick={toggleAreaC}
                  className="ml-2 text-sm p-1 rounded-lg bg-amber-300 text-white hover:bg-amber-400 transition"
                >
                  {isAreaCCollapsed ? "+" : "-"}
                </button>
              </div>
              {!isAreaCCollapsed && (
                <ul className="ml-6 mt-2 space-y-1">
                  <li>
                    <Link to="/c01" className="p-2 rounded-lg block text-gray-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                      C01
                    </Link>
                  </li>
                  <li>
                    <Link to="/c02" className="p-2 rounded-lg block text-gray-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                      C02
                    </Link>
                  </li>
                  <li>
                    <Link to="/c03" className="p-2 rounded-lg block text-gray-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                      C03
                    </Link>
                  </li>
                  <li>
                    <Link to="/c04" className="p-2 rounded-lg block text-gray-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                      C04
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Additional Sections */}
            <li>
              <Link
                to="/general/Cross-project cooperations"
                className="p-3 rounded-lg block text-gray-700 bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                Cross-project cooperations
              </Link>
            </li>
            {/* Updated vibrant colors for S, RTG, and Z */}
            <li>
              <Link
                to="/general/s"
                className="p-3 rounded-lg block text-gray-800 bg-lime-200 hover:bg-lime-300 transition-colors"
              >
                S
              </Link>
            </li>
            <li>
              <Link
                to="/general/z"
                className="p-3 rounded-lg block text-gray-800 bg-orange-200 hover:bg-orange-400 transition-colors"
              >
                Z
              </Link>
            </li>
            <li>
              <Link
                to="/general/rtg"
                className="p-3 rounded-lg block text-gray-800 bg-rose-200 hover:bg-rose-400 transition-colors"
              >
                RTG
              </Link>
            </li>

            <li>
              <Link
                to="/general/general information"
                className="p-3 rounded-lg block text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                General Information
              </Link>
            </li>
            <li>
              <Link
                to="/general/inf"
                className="p-3 rounded-lg block text-gray-700 bg-purple-100 hover:bg-purple-200 transition-colors"
              >
                INF
              </Link>
            </li>
            <li>
            <Link
                to="/general/recycle bin"
                className="p-3 rounded-lg block text-black bg-amber-200 hover:bg-amber-300 transition-colors"
              >
                Recycle Bin
              </Link>


            </li>
          </ul>
        </nav>

        <br />

        <Link to={`/create/new_container/${'root'}`}>
          <button className="flex items-center justify-center gap-2 p-3 w-full text-gray-800 bg-green-200 hover:bg-green-300 rounded-lg transition-colors">
            <span className="text-lg">＋</span> <span>Add Container</span>
          </button>
        </Link>
        <br />

        <br />
        <div className="mb-6">
          <img src={logo} alt="CRC 1625 Logo" className="w-full h-auto" />
        </div>

      </aside>

      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 bg-white p-10 shadow-md rounded-lg">
          <Outlet />
        </main>
        <ChatbotComponent />
      </div>
    </div>
  );
};

export default MainLayout;



