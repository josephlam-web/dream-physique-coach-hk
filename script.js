// Paste your Sheet ID and API Key here:
const SHEET_ID = '1GE_RWfeKsExWvVjXUc6supXqL5xyqxOGzC_FZhJlio8';
const API_KEY = 'AIzaSyA5fHN_qhG2hSDVqX0uMyIWAxtgbDuM074';

let globalWhatsAppNumber = '';

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupModalListeners();
});

// Helper function to convert 2D array from Google Sheets API to Array of Objects
function parseSheetData(values) {
  if (!values || values.length < 2) return [];
  
  // Clean headers (row 0) to match lower_snake_case keys
  const headers = values[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = values.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || ''; // Handle empty cells safely
    });
    return obj;
  });
}

async function fetchData() {
  const tabs = ['Hero', 'Events', 'Packages', 'Gallery', 'Schedule', 'Testimonials', 'FAQ'];
  const rangesQuery = tabs.map(tab => `ranges=${tab}`).join('&');
  
  // Google Sheets API v4 Endpoint using batchGet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?${rangesQuery}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const json = await response.json();

    if (json.valueRanges) {
      const data = {};
      
      // Map API response back to our expected data structure
      json.valueRanges.forEach((rangeData, index) => {
        const tabName = tabs[index];
        data[tabName] = parseSheetData(rangeData.values);
      });
      
      // Render Content
      if (data.Hero && data.Hero.length > 0) renderHero(data.Hero[0]);
      if (data.Events) renderEvents(data.Events);
      if (data.Packages) renderPackages(data.Packages);
      if (data.Gallery) renderGallery(data.Gallery);
      if (data.Schedule) renderSchedule(data.Schedule);
      if (data.Testimonials) renderTestimonials(data.Testimonials);
      if (data.FAQ) renderFAQ(data.FAQ);

      // Setup Modal Dropdown Options
      populateServiceDropdown(data.Packages || [], data.Events || []);

      // Bind all "Book Now" / Pricing CTAs to open the modal
      document.querySelectorAll('a[href="#packages"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openModal();
        });
      });

    } else {
      console.error('Error fetching data:', json.error ? json.error.message : 'Unknown error');
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

// --- Render Functions ---

function renderHero(hero) {
  document.getElementById('hero-headline').innerText = hero.headline || '';
  document.getElementById('hero-subheadline').innerText = hero.subheadline || '';
  
  const ctaBtn = document.getElementById('hero-cta');
  if (hero.cta_text) ctaBtn.innerText = hero.cta_text;

  if (hero.bg_image_url) {
    document.getElementById('hero').style.backgroundImage = `url('${hero.bg_image_url}')`;
  }

  if (hero.whatsapp_number) {
    globalWhatsAppNumber = String(hero.whatsapp_number).replace(/[^0-9]/g, '');
    document.getElementById('whatsapp-btn').href = `https://wa.me/${globalWhatsAppNumber}`;
  }
}

function renderEvents(events) {
  const container = document.getElementById('events-container');
  container.innerHTML = events.map(evt => `
    <div class="card">
      <div class="event-date">${evt.date || ''} ${evt.time ? '• ' + evt.time : ''}</div>
      <h3 class="event-title">${evt.name || ''}</h3>
      <div class="event-location">📍 ${evt.location || ''}</div>
      <p>${evt.description || ''}</p>
      <button onclick="openModal('Event: ${evt.name}')" class="btn btn-primary" style="margin-top:16px; text-align:center;">Register</button>
    </div>
  `).join('');
}

function renderPackages(packages) {
  const container = document.getElementById('packages-container');
  container.innerHTML = packages.map(pkg => {
    const featuresArr = pkg.features ? pkg.features.split(';') : [];
    return `
      <div class="card pricing-card">
        ${pkg.badge ? `<span class="pricing-badge">${pkg.badge}</span>` : ''}
        <h3>${pkg.title || ''}</h3>
        <div class="price">${pkg.price || ''}</div>
        <ul class="features-list">
          ${featuresArr.map(f => `<li>✓ ${f.trim()}</li>`).join('')}
        </ul>
        <button onclick="openModal('Package: ${pkg.title}')" class="btn btn-primary" style="text-align:center; width:100%;">
          ${pkg.cta_text || 'Get Started'}
        </button>
      </div>
    `;
  }).join('');
}

function renderGallery(gallery) {
  const container = document.getElementById('gallery-container');
  container.innerHTML = gallery.map(item => `
    <div class="gallery-item">
      <img src="${item.image_url}" alt="${item.title || 'Portfolio Image'}" loading="lazy">
    </div>
  `).join('');
}

function renderSchedule(schedule) {
  const container = document.getElementById('schedule-container');
  container.innerHTML = schedule.map(row => {
    const isAvailable = String(row.status).toLowerCase() === 'available';
    return `
      <tr>
        <td><strong>${row.day || ''}</strong></td>
        <td>${row.time_slot || ''}</td>
        <td>${row.activity || ''}</td>
        <td>
          <span class="status-badge ${isAvailable ? 'status-available' : 'status-booked'}">
            ${row.status || 'N/A'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTestimonials(testimonials) {
  const container = document.getElementById('testimonials-container');
  container.innerHTML = testimonials.map(item => {
    const stars = '★'.repeat(Number(item.rating) || 5);
    return `
      <div class="card testimonial-card">
        <div class="rating">${stars}</div>
        <p>"${item.quote || ''}"</p>
        <div class="client-info">
          ${item.avatar_url ? `<img src="${item.avatar_url}" class="client-avatar" alt="${item.name}">` : ''}
          <div>
            <strong>${item.name || ''}</strong><br>
            <small style="color:var(--text-muted);">${item.role_or_service || ''}</small>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderFAQ(faqs) {
  const container = document.getElementById('faq-container');
  container.innerHTML = faqs.map(item => `
    <div class="accordion-item">
      <button class="accordion-header">
        <span>${item.question || ''}</span>
        <span>+</span>
      </button>
      <div class="accordion-content">
        <p>${item.answer || ''}</p>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.accordion-header').forEach(button => {
    button.addEventListener('click', () => {
      const accordionItem = button.parentElement;
      accordionItem.classList.toggle('active');
      const icon = button.querySelector('span:last-child');
      icon.textContent = accordionItem.classList.contains('active') ? '−' : '+';
    });
  });
}

// --- Modal & Form Logic (WhatsApp Only) ---

function populateServiceDropdown(packages, events) {
  const select = document.getElementById('booking-service');
  select.innerHTML = '<option value="" disabled selected>Select a package or event</option>';

  if (packages && packages.length > 0) {
    const pkgGroup = document.createElement('optgroup');
    pkgGroup.label = 'Packages';
    packages.forEach(p => {
      if (p.title) pkgGroup.innerHTML += `<option value="Package: ${p.title}">Package: ${p.title} (${p.price || ''})</option>`;
    });
    select.appendChild(pkgGroup);
  }

  if (events && events.length > 0) {
    const evtGroup = document.createElement('optgroup');
    evtGroup.label = 'Workshops & Events';
    events.forEach(e => {
      if (e.name) evtGroup.innerHTML += `<option value="Event: ${e.name}">Event: ${e.name} (${e.date || ''})</option>`;
    });
    select.appendChild(evtGroup);
  }
}

function setupModalListeners() {
  const modal = document.getElementById('booking-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const form = document.getElementById('booking-form');

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', handleFormSubmit);
}

window.openModal = function(preselectedService = '') {
  const modal = document.getElementById('booking-modal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  if (preselectedService) {
    const select = document.getElementById('booking-service');
    select.value = preselectedService;
  }
}

function closeModal() {
  const modal = document.getElementById('booking-modal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

// Submits the form data directly into a pre-filled WhatsApp message
function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submit-booking-btn');
  const statusMsg = document.getElementById('form-status-msg');
  
  const formData = {
    name: document.getElementById('booking-name').value.trim(),
    email: document.getElementById('booking-email').value.trim(),
    phone: document.getElementById('booking-phone').value.trim(),
    service: document.getElementById('booking-service').value,
    preferred_date: document.getElementById('booking-date').value.trim(),
    notes: document.getElementById('booking-notes').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.innerText = 'Opening WhatsApp...';
  statusMsg.className = 'form-status success';
  statusMsg.innerText = 'Redirecting to WhatsApp to complete booking...';

  // Format WhatsApp Message
  const waText = `Hi! I'd like to book a session.%0A%0A` +
    `*Name:* ${encodeURIComponent(formData.name)}%0A` +
    `*Service:* ${encodeURIComponent(formData.service)}%0A` +
    `*Preferred Date:* ${encodeURIComponent(formData.preferred_date)}%0A` +
    `*Email:* ${encodeURIComponent(formData.email)}%0A` +
    `*Notes:* ${encodeURIComponent(formData.notes || 'None')}`;

  const waUrl = `https://wa.me/${globalWhatsAppNumber}?text=${waText}`;

  setTimeout(() => {
    window.open(waUrl, '_blank');
    closeModal();
    e.target.reset();
    submitBtn.disabled = false;
    submitBtn.innerText = 'Confirm Booking';
    statusMsg.innerText = '';
  }, 800);
}