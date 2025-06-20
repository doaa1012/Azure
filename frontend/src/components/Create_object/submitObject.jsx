import { Link } from 'react-router-dom'; // Ensure Link is imported

export const handleSubmit = async ({
  formData,
  token,
  groupName,
  navigate,
  setErrorMessage,
}) => {
  try {
    const payload = new FormData();

    payload.append('tenantId', 4);
    payload.append('typeId', formData.type);
    payload.append('rubricId', formData.rubricId);
    payload.append('sortCode', formData.sortCode || 0);
    payload.append(
      'accessControl',
      formData.accessControl === 'protected'
        ? 1
        : formData.accessControl === 'public'
        ? 2
        : 3
    );

    if (!formData.filePath) {
      setErrorMessage("Error: No file provided.");
      return;
    }

    // Extract the name from the file name (without extension)
    const fileName = formData.filePath.name;
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

    payload.append('name', nameWithoutExtension);
    payload.append('description', formData.description);
    payload.append('filePath', formData.filePath);

    if (formData.objectId) {
      payload.append('objectId', formData.objectId);
    }

    console.log("Submitting Payload:", Array.from(payload.entries()));

    // API request to create the object
    const response = await fetch('http://127.0.0.1:8000/api/create_object/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    });

    const data = await response.json();
    console.log('API Response:', data);

    // Handle Conflict (Duplicate File Exists)
    if (response.status === 409 && data.error === 'File already exists with the same content.') {
      if (data.existing_object && data.existing_object.objectId) {
        setErrorMessage(
          <>
            File already exists. View existing object:{' '}
            <Link
              to={`/object/${data.existing_object.objectId}`}
              className="text-blue-600 underline"
            >
              {data.existing_object.objectName || `Object ID: ${data.existing_object.objectId}`}
            </Link>
          </>
        );
      } else {
        setErrorMessage('A file with the same content already exists, but object details are missing.');
      }
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || 'An unexpected error occurred.');
    }

    // Redirect after successful creation
    navigate(`/${groupName ? encodeURIComponent(groupName) : ''}`);

  } catch (error) {
    console.error('Error submitting form:', error.message);
    setErrorMessage(error.message || 'An unknown error occurred.');
  }
};
