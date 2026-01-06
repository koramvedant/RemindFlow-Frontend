// add-invoice.js

// --------------------
// Mock clients (replace with API later)
// --------------------
const clients = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Acme Corp' },
  ];
  
  // --------------------
  // Elements
  // --------------------
  const searchInput = document.getElementById('clientSearch');
  const dropdown = document.getElementById('clientDropdown');
  const continueBtn = document.getElementById('continueBtn');
  const invoiceDate = document.getElementById('invoiceDate');
  const dueDate = document.getElementById('dueDate');
  const discount = document.getElementById('discount');
  const notes = document.getElementById('notes');
  const layoutSelect = document.getElementById('layoutSelect');
  
  let selectedClient = null;
  
  // --------------------
  // Client search logic
  // --------------------
  if (searchInput && dropdown) {
    searchInput.addEventListener('input', () => {
      dropdown.innerHTML = '';
      const val = searchInput.value.toLowerCase();
      if (!val) {
        dropdown.style.display = 'none';
        return;
      }
  
      const matches = clients.filter((c) => c.name.toLowerCase().includes(val));
  
      matches.forEach((c) => {
        const li = document.createElement('li');
        li.textContent = c.name;
        li.onclick = () => {
          searchInput.value = c.name;
          selectedClient = c;
          dropdown.style.display = 'none';
        };
        dropdown.appendChild(li);
      });
  
      dropdown.style.display = matches.length ? 'block' : 'none';
    });
  
    // Hide dropdown if clicked outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== searchInput) {
        dropdown.style.display = 'none';
      }
    });
  }
  
  // --------------------
  // Collect line items
  // --------------------
  function getInvoiceItems() {
    const rows = document.querySelectorAll('.item-row');
    const items = [];
  
    rows.forEach((row) => {
      const description = row.querySelector('.item-desc')?.value.trim();
      const quantity = Number(row.querySelector('.item-qty')?.value);
      const rate = Number(row.querySelector('.item-rate')?.value);
  
      if (!description || quantity <= 0 || rate <= 0) return;
  
      items.push({ description, quantity, rate });
    });
  
    return items;
  }
  
  // --------------------
  // Collect taxes (optional)
  // --------------------
  function getTaxes() {
    const taxName = document.getElementById('taxName')?.value.trim();
    const taxRate = Number(document.getElementById('taxRate')?.value);
  
    if (!taxName || taxRate <= 0) return [];
  
    return [{ label: taxName, rate: taxRate }];
  }
  
  // --------------------
  // Continue button
  // --------------------
  if (continueBtn) {
    continueBtn.onclick = () => {
      if (!selectedClient) {
        alert('Please select a client first.');
        return;
      }
  
      const items = getInvoiceItems();
      if (!items.length) {
        alert('Add at least one invoice item.');
        return;
      }
  
      const draftPayload = {
        client_id: selectedClient.id,
        invoice_date: invoiceDate?.value || '',
        due_date: dueDate?.value || '',
        items,
        taxes: getTaxes(),
        discount: Number(discount?.value) || 0,
        notes: notes?.value || '',
        layout_id: Number(layoutSelect?.value) || 1,
      };
  
      // Store draft for preview step
      sessionStorage.setItem('invoiceDraft', JSON.stringify(draftPayload));
  
      // Correct redirect for frontend setup
      window.location.href = '/invoice-preview.html';
    };
  }
  