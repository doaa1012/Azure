import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import config from '../../config_path';
const LiteratureReferenceForm = () => {
  const { typeName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const rubricnameurl = queryParams.get('rubricnameurl');

  const [formData, setFormData] = useState({
    type: typeName,
    rubricId: '',
    sortCode: 0,
    accessControl: 'protected',
    name: '',
    url: '',
    filePath: null, // 🔹 Ensure file is stored properly
    description: '',
    authors: '',
    title: '',
    journal: '',
    year: '',
    volume: '',
    number: '',
    startPage: '',
    endPage: '',
    doi: '',
    bibtex: '',
  });

  const [rubrics, setRubrics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetch(`${config.BASE_URL}api/rubrics/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch rubrics: ${response.statusText}`);
        }
        return response.json();
      })
      .then((fetchedData) => {
        if (isMounted) {
          setRubrics(fetchedData);

          if (rubricnameurl) {
            const matchingRubric = fetchedData.find(
              (rubric) => rubric.rubricnameurl.toLowerCase() === rubricnameurl.toLowerCase()
            );
            if (matchingRubric) {
              setFormData((prevData) => ({
                ...prevData,
                rubricId: matchingRubric.rubricid,
              }));
            }
          }
        }
      })
      .catch((error) => {
        if (isMounted) console.error('Error fetching rubrics:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [rubricnameurl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      filePath: e.target.files[0], // 🔹 Store file in state
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const payload = new FormData();

    payload.append('tenantId', 4);
    payload.append('typeId', typeName);
    payload.append('name', formData.name);

    Object.keys(formData).forEach((key) => {
      if (formData[key] && key !== 'filePath') {
        payload.append(key, formData[key]);
      }
    });

    if (formData.filePath) {
      payload.append('filePath', formData.filePath); // 🔹 Append file to FormData
    }

    fetch(`${config.BASE_URL}api/create_reference/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload, // 🔹 FormData allows file upload
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error Response:', errorData);
          throw new Error(`Failed to create reference: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.message === 'Object and Reference created successfully!') {
          navigate(-2);
        } else {
          setErrorMessage('Unexpected response from the server.');
        }
      })
      .catch((error) => {
        setErrorMessage(error.message || 'An unknown error occurred.');
      });
  };

  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600">
            Create New Reference ({typeName})
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
            <label className="block text-lg font-semibold text-blue-800">Rubric</label>
            <select
              name="rubricId"
              value={formData.rubricId}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
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
            <label className="block text-lg font-semibold text-blue-800">Upload File</label>
            <input
              type="file"
              name="filePath"
              onChange={handleFileChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            ></textarea>
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Authors</label>
            <input
              type="text"
              name="authors"
              value={formData.authors}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">Journal</label>
            <input
              type="text"
              name="journal"
              value={formData.journal}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-semibold text-blue-800">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-blue-800">Volume</label>
              <input
                type="text"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              />
            </div>
          </div>

     

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-semibold text-blue-800">Start Page</label>
              <input
                type="text"
                name="startPage"
                value={formData.startPage}
                onChange={handleInputChange}
                className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-blue-800">End Page</label>
              <input
                type="text"
                name="endPage"
                value={formData.endPage}
                onChange={handleInputChange}
                className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">DOI</label>
            <input
              type="text"
              name="doi"
              value={formData.doi}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
              <label className="block text-lg font-semibold text-blue-800">Number (issue)</label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleInputChange}
                className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              />
            </div>


          <div>
            <label className="block text-lg font-semibold text-blue-800">BibTeX</label>
            <textarea
              name="bibtex"
              value={formData.bibtex}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded h-32"
            ></textarea>
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

export default LiteratureReferenceForm;

