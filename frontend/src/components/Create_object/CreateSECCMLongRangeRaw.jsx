import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import config from '../../config_path';
const CreateSECCMLongRangeRaw = () => {
  const { typeName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const rubricnameurl = queryParams.get('rubricnameurl');
  const objectId = queryParams.get('objectId');
  const [isRubricFromUrl, setIsRubricFromUrl] = useState(false);

  const ACCESS_CONTROL_MAP = {
    public: 'Public',
    protected: 'Protected',
    protectednda: 'Protected NDA',
    private: 'Private',
  };
 

  const [formData, setFormData] = useState({
    rubricId: '',
    sortCode: 0,
    accessControl: 'protected',
    name: '',
    url: '',
    filePath: '',
    description: '',
    pH: '',
    offsetPotential: '',
    referenceElectrode: 'Ag/AgCl',
    capillaryDiameter: '',
  });

  const [rubrics, setRubrics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    fetch(`${config.BASE_URL}api/rubrics/`)
      .then((response) => response.json())
      .then((data) => {
        setRubrics(data);
        if (rubricnameurl) {
          const matchingRubric = data.find(
            (rubric) => rubric.rubricnameurl.toLowerCase() === rubricnameurl.toLowerCase()
          );
          if (matchingRubric) {
            setFormData((prevData) => ({
              ...prevData,
              rubricId: matchingRubric.rubricid,
            }));
            setIsRubricFromUrl(true); // 👈 mark it came from URL
          } else {
            setErrorMessage('No matching rubric found for the provided URL.');
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
    const formDataObj = new FormData();
  
    // Retrieve the mapped access control value
    const accessControlValue = ACCESS_CONTROL_MAP[formData.accessControl];
  
    // Ensure required fields are appended
    formDataObj.append('rubricId', formData.rubricId || '');
    formDataObj.append('sortCode', formData.sortCode || 0);
    formDataObj.append('accessControl', accessControlValue || 'protected');
    formDataObj.append('name', formData.name || '');
    formDataObj.append('url', formData.url || '');
    formDataObj.append('description', formData.description || '');
    formDataObj.append('typeId', typeName || ''); // Ensure typeId is passed
    formDataObj.append('tenantId', '4'); // Default tenantId
  
    // Append file if selected
    if (formData.filePath) {
      formDataObj.append('filePath', formData.filePath);
    }
  
    // Collect all fields dynamically into the properties array
    const properties = [
      { name: 'pH', value: parseFloat(formData.pH), comment: 'pH between 0 and 14', type: 'float' },
      { name: 'Offset Potential', value: parseFloat(formData.offsetPotential), comment: 'V (positive or negative)', type: 'float' },
      { name: 'Reference Electrode', value: formData.referenceElectrode, comment: 'Selected value from the options list (Ag/AgCl/3M KCl, ...)', type: 'int' },
      { name: 'Capillary Diameter', value: parseFloat(formData.capillaryDiameter), comment: 'nm', type: 'float' },
    ];
    
    // Log properties to verify correctness
    console.log('Submitting properties:', properties);
  
    formDataObj.append('properties', JSON.stringify(properties));
  
    fetch('http://127.0.0.1:8000/api/create_object_with_properties/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`, // FormData handles multipart encoding; no Content-Type needed
      },
      body: formDataObj,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.message === 'Object created successfully!' && data.objectId) {
          navigate(-2); // Navigate back on success
        } else {
          setErrorMessage(data.error || 'Unknown error occurred.');
        }
      })
      .catch((error) => setErrorMessage(error.message));
  };
  
  

  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
    <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-blue-600">
          Create New Object ({typeName})
        </h1>
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
  <label className="block text-lg font-semibold text-blue-800">
    Area or Project to Belong
  </label>
  <select
  name="rubricId"
  value={formData.rubricId}
  onChange={handleInputChange}
  className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
  disabled={isRubricFromUrl} // 👈 disable only if URL pre-filled it
>
  <option value="">-- Select Rubric --</option>
  {rubrics.map((rubric) => (
    <option key={rubric.rubricid} value={rubric.rubricid}>
      {rubric.rubricname}
    </option>
  ))}
</select>

</div>



          <div>
            <label className="block font-semibold text-blue-800">Sort Code</label>
            <input
              type="number"
              name="sortCode"
              value={formData.sortCode}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold text-blue-800">Access Control</label>
            <select
              name="accessControl"
              value={formData.accessControl}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            >
              {Object.entries(ACCESS_CONTROL_MAP).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>


          <div>
            <label className="block font-semibold text-blue-800">Name</label>
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
            <label className="block font-semibold text-blue-800">URL</label>
            <input
              type="text"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              placeholder="Enter unique URL"
            />
          </div>

          <div>
            <label className="block font-semibold text-blue-800">File Path</label>
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
            <label className="block font-semibold text-blue-800">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded h-32"
              placeholder="Enter description"
            ></textarea>
          </div>

          <div className="border-t border-blue-300 pt-6">
            <h2 className="text-lg font-bold text-blue-800 mb-4">Measurements</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-blue-800">pH</label>
                <input
                  type="number"
                  name="pH"
                  value={formData.pH}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
                  placeholder="pH (0-14)"
                  min="0"
                  max="14"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-800">Offset Potential</label>
                <input
                  type="number"
                  name="offsetPotential"
                  value={formData.offsetPotential}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
                  placeholder="Offset potential (V)"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-800">Reference Electrode</label>
                <select
                  name="referenceElectrode"
                  value={formData.referenceElectrode}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
                >
                  <option value="Ag/AgCl">Ag/AgCl</option>
                  <option value="Hg/HgO">Hg/HgO</option>
                  <option value="SHE">3M KCl</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-blue-800">Capillary Diameter</label>
                <input
                  type="number"
                  name="capillaryDiameter"
                  value={formData.capillaryDiameter}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
                  placeholder="Capillary diameter (nm)"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              onClick={() => navigate(-1)}
            >
              Back
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

export default CreateSECCMLongRangeRaw;
