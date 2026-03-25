const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultDiv = document.getElementById('result');

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a CSV file');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadBtn.disabled = true;
  uploadBtn.innerText = 'Uploading...';

  try {
    const res = await fetch('/api/invoices/import', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      resultDiv.innerHTML = `
        <p>✅ Imported successfully</p>
        <p>Total: ${data.summary.total}</p>
        <p>Created: ${data.summary.created}</p>
        <p>Failed: ${data.summary.failed}</p>
      `;
    } else {
      resultDiv.innerHTML = `<p>❌ ${data.message}</p>`;
    }

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<p>❌ Upload failed</p>`;
  }

  uploadBtn.disabled = false;
  uploadBtn.innerText = 'Upload';
});