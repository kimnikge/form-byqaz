'use strict';

'use strict';

// ─── i18n ────────────────────────────────────────────────────────────────────

let currentLang = localStorage.getItem('lang') || 'ru';
let translations = {};

async function loadLang(lang) {
  const res = await fetch(`/i18n/${lang}.json`);
  translations = await res.json();
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
  updateLangButtons();
}

function t(key) {
  return translations[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function setLang(lang) {
  loadLang(lang);
}

// ─── Phone formatting ────────────────────────────────────────────────────────
function initPhoneInput() {
  const input = document.getElementById('field-phone');
  if (!input) return;
  input.addEventListener('input', () => {
    let val = input.value.replace(/\D/g, '');
    if (val.startsWith('8')) val = '7' + val.slice(1);
    if (val && !val.startsWith('7')) val = '7' + val;
    if (val.length > 11) val = val.slice(0, 11);
    input.value = val ? '+' + val : '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '+7') {
      e.preventDefault();
      input.value = '';
    }
  });
  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+7';
  });
  input.addEventListener('blur', () => {
    if (input.value === '+7') input.value = '';
  });
}

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  role: null,
  industry: null,
  industries: [],
  buyerType: null,
};

const PHONE_RE = /^\+7\d{10}$/;
const TOTAL_STEPS = 3;

// ─── Navigation ──────────────────────────────────────────────────────────────

function showStep(index) {
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
  // Update stepper
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const circle = document.getElementById(`stepper-circle-${i}`);
    const label  = document.getElementById(`stepper-label-${i}`);
    const line   = document.getElementById(`stepper-line-${i}`);
    if (i < index) {
      circle.className = 'stepper-circle done';
      circle.textContent = '✓';
      label.className = 'stepper-label done';
    } else if (i === index) {
      circle.className = 'stepper-circle active';
      circle.textContent = i + 1;
      label.className = 'stepper-label active';
    } else {
      circle.className = 'stepper-circle';
      circle.textContent = i + 1;
      label.className = 'stepper-label';
    }
    if (line) line.className = i < index ? 'stepper-line done' : 'stepper-line';
  }
  // Scroll card into view on mobile
  document.getElementById('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goNext(currentStep) {
  clearError(currentStep);
  if (currentStep === 0) {
    if (!state.role) { showError(0, t('err_role')); return; }
    renderStep1();
    showStep(1);
  } else if (currentStep === 1) {
    if (state.role === 'manufacturer' && !state.industry) {
      showError(1, t('err_industry')); return;
    }
    if (state.role === 'supplier' && state.industries.length === 0) {
      showError(1, t('err_industry')); return;
    }
    if (state.role === 'buyer' && !state.buyerType) {
      showError(1, t('err_buyer_type')); return;
    }
    showStep(2);
  }
}

function goBack(currentStep) {
  showStep(currentStep - 1);
}

// ─── Step 1: Role ────────────────────────────────────────────────────────────

function selectRole(btn) {
  document.querySelectorAll('.role-list .option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.role = btn.dataset.role;
  // Reset downstream
  state.industry = null;
  state.industries = [];
  state.buyerType = null;
}

// ─── Step 2: Industry / Buyer type ───────────────────────────────────────────

function renderStep1() {
  document.getElementById('block-manufacturer').style.display = state.role === 'manufacturer' ? 'block' : 'none';
  document.getElementById('block-supplier').style.display     = state.role === 'supplier'     ? 'block' : 'none';
  document.getElementById('block-buyer').style.display        = state.role === 'buyer'         ? 'block' : 'none';
  applyTranslations();
}

function selectIndustry(btn) {
  document.querySelectorAll('#industry-single .option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.industry = btn.dataset.industry;
}

function toggleCheckLabel(checkbox) {
  const label = checkbox.closest('.check-label');
  label.classList.toggle('checked', checkbox.checked);
  const val = checkbox.value;
  if (checkbox.checked) {
    if (!state.industries.includes(val)) state.industries.push(val);
  } else {
    state.industries = state.industries.filter(v => v !== val);
  }
}

function selectBuyerType(btn) {
  document.querySelectorAll('.buyer-list .option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.buyerType = btn.dataset.buyer;
}

// ─── Select all / deselect all for supplier ──────────────────────────────────
function toggleSelectAll(btn) {
  const checkboxes = document.querySelectorAll('#block-supplier input[type="checkbox"]');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    cb.closest('.check-label').classList.toggle('checked', !allChecked);
  });
  state.industries = allChecked
    ? []
    : Array.from(checkboxes).map(cb => cb.value);
  btn.textContent = allChecked ? t('select_all') : t('deselect_all');
}

// ─── Step 3: Contacts + Submit ───────────────────────────────────────────────

async function submitForm() {
  clearError(2);
  const phoneEl = document.getElementById('field-phone');
  const errPhoneEl = document.getElementById('err-phone');
  const name = document.getElementById('field-name').value.trim();
  const phone = phoneEl.value.trim();
  const region = document.getElementById('field-region').value.trim();
  const hp = document.getElementById('field-hp').value;

  let valid = true;

  if (!phone || !PHONE_RE.test(phone)) {
    phoneEl.classList.add('error');
    errPhoneEl.textContent = t('err_phone');
    errPhoneEl.style.display = 'block';
    valid = false;
  } else {
    phoneEl.classList.remove('error');
    errPhoneEl.style.display = 'none';
  }

  if (!valid) return;

  const payload = {
    role: state.role,
    name,
    phone,
    region,
    _hp: hp,
  };

  if (state.role === 'manufacturer') payload.industry = state.industry;
  if (state.role === 'supplier')     payload.industries = state.industries;
  if (state.role === 'buyer')        payload.buyerType = state.buyerType;

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '…';

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      showSuccess();
    } else {
      showError(2, data.error || t('err_server'));
      btn.disabled = false;
      btn.textContent = t('submit');
    }
  } catch {
    showError(2, t('err_server'));
    btn.disabled = false;
    btn.textContent = t('submit');
  }
}

function showSuccess() {
  document.getElementById('formCard').style.display = 'none';
  const sc = document.getElementById('successCard');
  sc.style.display = 'block';
  applyTranslations();
}

// ─── Error helpers ───────────────────────────────────────────────────────────

function showError(step, msg) {
  const el = document.getElementById(`err-step${step}`);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError(step) {
  const el = document.getElementById(`err-step${step}`);
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ─── Init ────────────────────────────────────────────────────────────────────

loadLang(currentLang);
initPhoneInput();
