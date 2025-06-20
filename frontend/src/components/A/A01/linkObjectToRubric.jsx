import config from '../../../config_path';

export async function linkObjectToRubric(objectId) {
  const rubricId = window.prompt("Enter the Rubric ID you want to link this object to:");

  if (rubricId) {
    try {
      const response = await fetch(`${config.BASE_URL}api/link-object-to-rubric/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objectid: objectId, rubricid: rubricId }),
      });

      if (response.ok) {
        alert('Object successfully linked to rubric!');
      } else {
        alert('Failed to link object to rubric.');
      }
    } catch (error) {
      console.error('Error linking object to rubric:', error);
      alert('An error occurred.');
    }
  }
}
