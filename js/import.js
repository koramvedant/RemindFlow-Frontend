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
    const token = localStorage.getItem('accessToken');
  
    const res = await fetch('/api/invoices/import', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
  
    if (res.status === 401) {
      localStorage.clear();
      window.location.replace('/login.html');
      return;
    }
  
    let data;
    try {
      data = await res.json();
    } catch {
      resultDiv.innerHTML = `<p>❌ Invalid server response</p>`;
      return;
    }
  
    // ❌ HANDLE FAILURE FIRST
    if (!res.ok || !data.success) {
      resultDiv.innerHTML = `<p>❌ ${data?.message || 'Import failed'}</p>`;
      return;
    }
  
    // ✅ SAFE ACCESS
    const summary = data.summary || {};
  
    resultDiv.innerHTML = `
      <p>✅ Imported successfully</p>
      <p>Total: ${summary.total || 0}</p>
      <p>Created: ${summary.created || 0}</p>
      <p>Failed: ${summary.failed || 0}</p>
    `;
  
  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = `<p>❌ Upload failed</p>`;
  }

  uploadBtn.disabled = false;
  uploadBtn.innerText = 'Upload';
});