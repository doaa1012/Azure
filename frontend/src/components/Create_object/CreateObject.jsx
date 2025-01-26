import React, { useState, useEffect } from 'react';
import LiteratureReferenceForm from './LiteratureReferenceForm';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import ChemicalSystemSection from './ChemicalSystemSection';
import axios from 'axios';
import config from '../../config_path';

const CreateObject = () => {
  const { typeName } = useParams();
  if (typeName === 'Literature Reference' || typeName === 'Publication') {
    return <LiteratureReferenceForm onCancel={() => navigate(-1)} />;
  }

  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const rubricnameurl = queryParams.get('rubricnameurl');
  const objectId = queryParams.get('objectId');

  const [selectedElements, setSelectedElements] = useState([]);
  const [elementData, setElementData] = useState({});
  const [chemicalSystem, setChemicalSystem] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ACCESS_CONTROL_MAP = {
    public: 0,
    protected: 1,
    protectednda: 2,
    private: 3,
  };
  // State for Additional Inputs
  const [additionalValues, setAdditionalValues] = useState({
    tolerance: '', // Tolerance input
  });

  const handleAdditionalChange = (e) => {
    const { name, value } = e.target;
    setAdditionalValues((prev) => ({ ...prev, [name]: value }));
  };

  // State for User Dropdown
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');



  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };



  const handleConfirmElements = () => {
    setChemicalSystem(selectedElements.join('-'));
    setIsModalOpen(false);
  };


  console.log('rubricnameurl:', rubricnameurl);



  const [formData, setFormData] = useState({
    type: typeName,
    rubricId: '',
    sortCode: 0,
    accessControl: '', 
    name: '',
    url: '',
    filePath: '',
    description: '',
  });

  const [rubrics, setRubrics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const additionalInputs = [
    { name: "requestedAmount", label: "Requested Amount (g)", type: "number", placeholder: "Enter amount in grams" },
    { name: "desiredPurity", label: "Desired Purity (%)", type: "number", placeholder: "Enter purity percentage" },
  ];
  useEffect(() => {
    // Fetch users for the dropdown
    axios.get(`${config.BASE_URL}api/users/`)
      .then((response) => setUsers(response.data))
      .catch((error) => console.error('Error fetching users:', error));
  }, []);
  useEffect(() => {
    fetch(`${config.BASE_URL}api/rubrics/`)

      .then((response) => response.json())
      .then((data) => {
        setRubrics(data);
        if (rubricnameurl) {
          const matchingRubric = data.find((rubric) => rubric.rubricnameurl === rubricnameurl);
          if (matchingRubric) {
            setFormData((prevData) => ({
              ...prevData,
              rubricId: matchingRubric.rubricid,
            }));
          }
        }
      })
      .catch((error) => console.error('Error fetching rubrics:', error));
  }, [rubricnameurl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const payload = new FormData();

    payload.append('tenantId', 4);
    payload.append('typeId', typeName);
    payload.append('rubricId', formData.rubricId);
    payload.append('sortCode', formData.sortCode || 0);
    // Validate accessControl and append it
  const accessControlValue = ACCESS_CONTROL_MAP[formData.accessControl];
  if (accessControlValue !== undefined) {
    payload.append('accessControl', accessControlValue);
  } else {
    console.error('Access Control is required and not valid.');
    setErrorMessage('Please select a valid access control option.');
    return;
  }
    payload.append('name', formData.name);
    payload.append('url', formData.url);
    payload.append('description', formData.description);

    if (objectId) {
      payload.append('objectId', objectId);
    }

    if (formData.filePath) {
      payload.append('filePath', formData.filePath);
    }

    // Add Chemical System and Elements if applicable
    if (['Calculation/Computational Composition', 'Calculation/Computational Sample', 'Computational Composition Atom', 'Composition Test', 'Composition', 'Request for Synthesis'].includes(typeName)) {
      payload.append('chemicalSystem', chemicalSystem);

      const elementsArray = selectedElements.map((element) => ({
        name: element,
        absolute: elementData[element]?.absolute || null,
        percentage: elementData[element]?.percentage || null,
      }));
      payload.append('elements', JSON.stringify(elementsArray));
    }

    // Add Tolerance if applicable
    if (additionalValues.tolerance) {
      payload.append('tolerance', additionalValues.tolerance); // Add the tolerance value
    }

    console.log("Payload to be sent:", Array.from(payload.entries())); // Debugging

    fetch(`${config.BASE_URL}api/create_object/`, {
    
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error:", errorData);
          setErrorMessage(errorData.error || "An unexpected error occurred.");
          return;
        }
        const data = await response.json();
        console.log("Response from server:", data);
        if (data.message === 'Object created successfully!') {
          navigate(-2); // Go back to the previous page
        }
      })
      .catch((error) => {
        console.error("Request failed:", error);
        setErrorMessage("An unknown error occurred.");
      });
  };

  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600">Create New Object ({typeName})</h1>
        </div>
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-lg font-semibold text-blue-800">Type</label>
            <input
              type="text"
              value={typeName}
              disabled
              className="w-full p-3 bg-blue-100 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Area or Project to Belong</label>
            <select
              name="rubricId"
              value={formData.rubricId}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              disabled={!!rubricnameurl}
            >
              <option value="">-- Select Section --</option>
              {rubrics.map((rubric) => (
                <option key={rubric.rubricid} value={rubric.rubricid}>
                  {rubric.rubricname}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-lg font-semibold text-blue-800">Access Control</label>
            <select
              name="accessControl"
              value={formData.accessControl}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              required
            >
              <option value="">-- Select Access Control --</option>
              <option value="public">Public</option>
              <option value="protected">Protected</option>
              <option value="protectednda">Protected NDA</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              placeholder="Enter name"
            />
          </div>

          <div>
          <label className="block text-lg font-semibold text-blue-800">URL (unique)</label>
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleInputChange}
            className={`w-full p-3 bg-blue-50 border ${
              errorMessage.includes('URL') ? 'border-red-500' : 'border-blue-300'
            } rounded`}
            placeholder="Enter unique URL"
          />
        </div>


          <div>
            <label className="block text-lg font-semibold text-blue-800">File Path</label>
            <input
              type="file"
              name="filePath"
              onChange={(e) =>
                setFormData((prevData) => ({
                  ...prevData,
                  filePath: e.target.files[0],
                }))
              }
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded h-32"
              placeholder="Enter description"
            ></textarea>
          </div>
          {['Calculation/Computational Composition', 'Calculation/Computational Sample', 'Composition Test', "Computational Composition Atom", 'Composition'].includes(typeName) && (
            <ChemicalSystemSection
              chemicalSystem={chemicalSystem}
              selectedElements={selectedElements}
              elementData={elementData}
              isModalOpen={isModalOpen}
              setChemicalSystem={setChemicalSystem}
              setIsModalOpen={setIsModalOpen}
              setSelectedElements={setSelectedElements}
              setElementData={setElementData}
              showPercentage={
                typeName === "Calculation/Computational Composition" ||
                typeName === "Composition"
              } // Only show percentage for specific types
            />

          )}

          {typeName === "Request for Synthesis" && (
            <ChemicalSystemSection
              chemicalSystem={chemicalSystem}
              selectedElements={selectedElements}
              elementData={elementData}
              isModalOpen={isModalOpen}
              setChemicalSystem={setChemicalSystem}
              setIsModalOpen={setIsModalOpen}
              setSelectedElements={setSelectedElements}
              setElementData={setElementData}
              additionalValues={additionalValues}
              handleAdditionalChange={handleAdditionalChange}
              users={users}
              selectedUser={selectedUser}
              handleUserChange={handleUserChange}
              isSpecialType={true} // Pass true for special types
            />
          )}


          <div className="flex justify-between">
            <button
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => navigate(-1)}
            >
              Close and Back to the Site
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

};

export default CreateObject;
