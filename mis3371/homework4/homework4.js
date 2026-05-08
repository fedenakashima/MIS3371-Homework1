/*
Program name: homework4.js
Author: Federica Nakashima
Date created: 2026-03-01
Date last edited: 2026-04-18
MIS 3371 Homework 4 Java 
*/

const NAME_RE = /^[A-Za-z'\-]{1,30}$/;
const ADDRESS_RE = /^[A-Za-z0-9\s\.,#'\-\/]{2,30}$/;

function $(id) {
  return document.getElementById(id);
}

const STATES_JSON_URL = "states.json";

function normalizeStateEntry(row) {
  if (!row || typeof row !== "object") return null;
  const code = row.code || row.abbr || row.state || "";
  const name = row.name || row.stateName || "";
  if (!code || !name) return null;
  return { code: String(code).toUpperCase().slice(0, 2), name: String(name) };
}

function fillStateSelects(states) {
  const selPatient = $("state");
  const selEmg = $("emgState");
  if (!selPatient || !selEmg) return;
  const prevP = selPatient.value;
  const prevE = selEmg.value;
  const emptyLabel = "Select state";
  function build(sel) {
    sel.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = emptyLabel;
    sel.appendChild(first);
    states.forEach((s) => {
      const o = document.createElement("option");
      o.value = s.code;
      o.textContent = s.name;
      sel.appendChild(o);
    });
  }
  build(selPatient);
  build(selEmg);
  if ([...selPatient.options].some((o) => o.value === prevP)) selPatient.value = prevP;
  if ([...selEmg.options].some((o) => o.value === prevE)) selEmg.value = prevE;
  selPatient.classList.remove("states-loading");
  selEmg.classList.remove("states-loading");
}

async function loadStatesWithFetch() {
  const msg = document.getElementById("stateFetchMsg");
  const selPatient = $("state");
  const selEmg = $("emgState");
  const fail = (text) => {
    if (msg) {
      msg.textContent = text;
      msg.classList.add("state-fetch-msg--error");
    }
    if (selPatient) {
      selPatient.innerHTML = '<option value="">Could not load states</option>';
      selPatient.classList.remove("states-loading");
    }
    if (selEmg) {
      selEmg.innerHTML = '<option value="">Could not load states</option>';
      selEmg.classList.remove("states-loading");
    }
  };

  try {
    const res = await fetch(STATES_JSON_URL);
    if (!res.ok) throw new Error(`Could not load ${STATES_JSON_URL} (HTTP ${res.status}).`);
    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.states;
    if (!Array.isArray(raw)) throw new Error('states.json must be an array or { "states": [...] }.');
    const states = raw.map(normalizeStateEntry).filter(Boolean);
    if (states.length < 10) throw new Error("State list in JSON looks invalid (too few entries).");
    states.sort((a, b) => a.name.localeCompare(b.name));
    fillStateSelects(states);
    if (msg) {
      msg.textContent = "";
      msg.classList.remove("state-fetch-msg--error");
    }
  } catch (err) {
    console.error(err);
    fail(err.message || "Failed to load state list.");
  }
}

function setMsg(errId, message) {
  const el = typeof errId === "string" ? $(errId) : errId;
  if (!el) return;
  el.textContent = message || "";
}

function setInvalid(input, isInvalid) {
  if (!input) return;
  input.classList.toggle("field-invalid", Boolean(isInvalid));
}

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function validateFirstLast(input, errId, label) {
  const v = (input.value || "").trim();
  if (!v) {
    setMsg(errId, `${label} is required.`);
    setInvalid(input, true);
    return false;
  }
  if (v.length < 1 || v.length > 30 || !NAME_RE.test(v)) {
    setMsg(errId, `${label}: use letters, apostrophes, and dashes only (1–30).`);
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateMiddle(input, errId) {
  const v = (input.value || "").trim();
  if (!v) {
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  if (!/^[A-Za-z]$/.test(v)) {
    setMsg(errId, "Middle initial must be one letter.");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function parseMMDDYYYY(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim());
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12) return null;
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;
  return dt;
}

function validateDOB(input, errId) {
  const raw = (input.value || "").trim();
  if (!raw) {
    setMsg(errId, "Date of birth is required.");
    setInvalid(input, true);
    return false;
  }
  const dt = parseMMDDYYYY(raw);
  if (!dt) {
    setMsg(errId, "Use MM/DD/YYYY with a real calendar date.");
    setInvalid(input, true);
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dob = new Date(dt);
  dob.setHours(0, 0, 0, 0);

  if (dob > today) {
    setMsg(errId, "Birthday cannot be in the future.");
    setInvalid(input, true);
    return false;
  }

  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (dob < oldest) {
    setMsg(errId, "Birthday cannot be more than 120 years ago.");
    setInvalid(input, true);
    return false;
  }

  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function formatSSNWhileTyping(input) {
  const d = digitsOnly(input.value).slice(0, 9);
  let out = "";
  if (d.length >= 1) out = d.slice(0, 3);
  if (d.length >= 4) out += "-" + d.slice(3, 5);
  if (d.length >= 6) out += "-" + d.slice(5, 9);
  input.value = out;
}

function validateSSN(input, errId) {
  const d = digitsOnly(input.value);
  if (d.length !== 9) {
    setMsg(errId, "SSN must be exactly 9 digits (do not use a real SSN).");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateAddressLine(input, errId, requiredLabel, required) {
  const v = (input.value || "").trim();
  if (!v) {
    if (required) {
      setMsg(errId, `${requiredLabel} is required.`);
      setInvalid(input, true);
      return false;
    }
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  if (v.length < 2 || v.length > 30 || !ADDRESS_RE.test(v)) {
    setMsg(errId, "Use 2–30 characters: letters, numbers, spaces, . , # ' - /");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateCity(input, errId, required) {
  const v = (input.value || "").trim();
  if (!v) {
    if (required) {
      setMsg(errId, "City is required.");
      setInvalid(input, true);
      return false;
    }
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  if (v.length < 2 || v.length > 30) {
    setMsg(errId, "City must be 2–30 characters.");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateState(select, errId, required) {
  if (required && !select.value) {
    setMsg(errId, "Please select a state.");
    setInvalid(select, true);
    return false;
  }
  if (!required && !select.value) {
    setMsg(errId, "");
    setInvalid(select, false);
    return true;
  }
  setMsg(errId, "");
  setInvalid(select, false);
  return true;
}

function validateZip5(input, errId, required) {
  const v = (input.value || "").trim();
  if (!v) {
    if (required) {
      setMsg(errId, "ZIP is required.");
      setInvalid(input, true);
      return false;
    }
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  if (!/^\d{5}$/.test(v)) {
    setMsg(errId, "ZIP must be exactly 5 digits.");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateEmailLike(input, errId, forceLowercase, required) {
  let v = (input.value || "").trim();
  if (forceLowercase) {
    v = v.toLowerCase();
    input.value = v;
  }
  if (!v) {
    if (required) {
      setMsg(errId, "Email is required.");
      setInvalid(input, true);
      return false;
    }
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  if (!ok) {
    setMsg(errId, "Email must look like name@domain.tld");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validatePhone10(input, errId, required) {
  const v = (input.value || "").trim();
  if (!v) {
    if (required) {
      setMsg(errId, "Phone is required.");
      setInvalid(input, true);
      return false;
    }
    setMsg(errId, "");
    setInvalid(input, false);
    return true;
  }
  if (!/^\d{3}-\d{3}-\d{4}$/.test(v)) {
    setMsg(errId, "Phone must be 000-000-0000");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function normalizePhoneAsYouType(input) {
  const d = digitsOnly(input.value).slice(0, 10);
  if (d.length <= 3) input.value = d;
  else if (d.length <= 6) input.value = d.slice(0, 3) + "-" + d.slice(3);
  else input.value = d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
}

function validateSymptoms(textarea, errId) {
  const v = textarea.value || "";
  if (!v.trim()) {
    setMsg(errId, "");
    setInvalid(textarea, false);
    return true;
  }
  if (v.includes('"')) {
    setMsg(errId, 'Please avoid double quotes (") in this field.');
    setInvalid(textarea, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(textarea, false);
  return true;
}

function validateRadioGroup(name, errId) {
  const form = document.getElementById("patientForm");
  const picked = form.querySelector(`input[name="${name}"]:checked`);
  if (!picked) {
    setMsg(errId, "Please make a selection.");
    return false;
  }
  setMsg(errId, "");
  return true;
}

function wireRadioGroupLiveValidation(name, errId) {
  const form = document.getElementById("patientForm");
  form.querySelectorAll(`input[name="${name}"]`).forEach((r) => {
    r.addEventListener("change", () => validateRadioGroup(name, errId));
  });
}

function syncPainOutput() {
  const painLevel = $("painLevel");
  const painOutput = $("painOutput");
  if (!painLevel || !painOutput) return;
  painOutput.value = painLevel.value;
  setMsg("err-painLevel", "");
}

function updateInsuranceFields() {
  const form = document.getElementById("patientForm");
  const provider = $("insuranceProvider");
  const otherWrap = $("otherProviderWrap");
  const otherInput = $("otherProvider");

  const selected = form.querySelector('input[name="insurance"]:checked');
  const hasInsurance = selected && selected.value === "Yes";

  provider.disabled = !hasInsurance;

  if (!hasInsurance) {
    provider.value = "";
    otherWrap.style.display = "none";
    otherInput.value = "";
    setMsg("err-insuranceProvider", "");
    setMsg("err-otherProvider", "");
    setInvalid(provider, false);
    setInvalid(otherInput, false);
    validateRadioGroup("insurance", "err-insurance");
    return;
  }

  validateRadioGroup("insurance", "err-insurance");
  updateOtherProviderField();
  validateInsuranceProvider();
}

function updateOtherProviderField() {
  const provider = $("insuranceProvider");
  const otherWrap = $("otherProviderWrap");
  const otherInput = $("otherProvider");

  const isOther = provider.value === "Other";
  otherWrap.style.display = isOther ? "flex" : "none";
  if (!isOther) {
    otherInput.value = "";
    setMsg("err-otherProvider", "");
    setInvalid(otherInput, false);
  }
  validateInsuranceProvider();
}

function validateInsuranceProvider() {
  const form = document.getElementById("patientForm");
  const selected = form.querySelector('input[name="insurance"]:checked');
  const hasInsurance = selected && selected.value === "Yes";
  const provider = $("insuranceProvider");
  const otherInput = $("otherProvider");

  if (!hasInsurance) {
    setMsg("err-insuranceProvider", "");
    setInvalid(provider, false);
    return true;
  }

  if (!provider.value) {
    setMsg("err-insuranceProvider", "Select a provider.");
    setInvalid(provider, true);
    return false;
  }

  if (provider.value === "Other") {
    const t = (otherInput.value || "").trim();
    if (t.length < 1 || t.length > 30) {
      setMsg("err-otherProvider", "Other provider must be 1–30 characters.");
      setInvalid(otherInput, true);
      return false;
    }
    setMsg("err-otherProvider", "");
    setInvalid(otherInput, false);
  } else {
    setMsg("err-otherProvider", "");
    setInvalid(otherInput, false);
  }

  setMsg("err-insuranceProvider", "");
  setInvalid(provider, false);
  return true;
}

function validateUserID(input, errId) {
  let v = (input.value || "").trim().toLowerCase();
  input.value = v;

  if (!v) {
    setMsg(errId, "User ID is required.");
    setInvalid(input, true);
    return false;
  }
  if (v.length < 5 || v.length > 20) {
    setMsg(errId, "User ID must be 5–20 characters.");
    setInvalid(input, true);
    return false;
  }
  if (/^\d/.test(v)) {
    setMsg(errId, "User ID cannot start with a number.");
    setInvalid(input, true);
    return false;
  }
  if (!/^[a-z0-9_-]+$/.test(v)) {
    setMsg(errId, "Only letters, numbers, underscore, and dash. No spaces.");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validatePassword(input, errId) {
  const pw = input.value || "";
  const uid = ($("userID")?.value || "").trim().toLowerCase();

  if (!pw) {
    setMsg(errId, "Password is required.");
    setInvalid(input, true);
    return false;
  }
  if (pw.length < 8) {
    setMsg(errId, "Password must be at least 8 characters.");
    setInvalid(input, true);
    return false;
  }
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw)) {
    setMsg(errId, "Password needs at least 1 uppercase, 1 lowercase, and 1 digit.");
    setInvalid(input, true);
    return false;
  }
  if (uid && pw.toLowerCase() === uid) {
    setMsg(errId, "Password cannot equal your User ID.");
    setInvalid(input, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(input, false);
  return true;
}

function validateConfirmPassword(p1, p2, errId) {
  if (!p2.value) {
    setMsg(errId, "Please re-enter your password.");
    setInvalid(p2, true);
    return false;
  }
  if (p1.value !== p2.value) {
    setMsg(errId, "Passwords do not match.");
    setInvalid(p2, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(p2, false);
  return true;
}

function validateRelationship(select, errId) {
  if (!select.value) {
    setMsg(errId, "Select a relationship.");
    setInvalid(select, true);
    return false;
  }
  setMsg(errId, "");
  setInvalid(select, false);
  return true;
}

function runFullValidation() {
  const ok = [];

  ok.push(validateFirstLast($("firstName"), "err-firstName", "First name"));
  ok.push(validateMiddle($("middleInit"), "err-middleInit"));
  ok.push(validateFirstLast($("lastName"), "err-lastName", "Last name"));
  ok.push(validateDOB($("dob"), "err-dob"));
  ok.push(validateSSN($("ssn"), "err-ssn"));

  ok.push(validateRadioGroup("sex", "err-sex"));
  ok.push(validateRadioGroup("ethnicity", "err-ethnicity"));

  ok.push(validateAddressLine($("address1"), "err-address1", "Address line 1", true));
  ok.push(validateAddressLine($("address2"), "err-address2", "Address line 2", false));
  ok.push(validateCity($("city"), "err-city", true));
  ok.push(validateState($("state"), "err-state", true));
  ok.push(validateZip5($("zip"), "err-zip", true));
  ok.push(validateEmailLike($("email"), "err-email", true, true));
  ok.push(validatePhone10($("phone"), "err-phone", true));
  ok.push(validateSymptoms($("symptoms"), "err-symptoms"));

  ok.push(validateRadioGroup("insurance", "err-insurance"));
  ok.push(validateInsuranceProvider());

  ok.push(validateFirstLast($("emgFirstName"), "err-emgFirstName", "First name"));
  ok.push(validateMiddle($("emgMiddleInit"), "err-emgMiddleInit"));
  ok.push(validateFirstLast($("emgLastName"), "err-emgLastName", "Last name"));
  ok.push(validateRelationship($("relationship"), "err-relationship"));
  ok.push(validateAddressLine($("emgAddress1"), "err-emgAddress1", "Address line 1", true));
  ok.push(validateAddressLine($("emgAddress2"), "err-emgAddress2", "Address line 2", false));
  ok.push(validateCity($("emgCity"), "err-emgCity", false));
  ok.push(validateState($("emgState"), "err-emgState", false));
  ok.push(validateZip5($("emgZip"), "err-emgZip", false));
  ok.push(validateEmailLike($("emgEmail"), "err-emgEmail", true, false));
  ok.push(validatePhone10($("emgPhone"), "err-emgPhone", false));

  ok.push(validateRadioGroup("chestPain", "err-chestPain"));
  ok.push(validateRadioGroup("priorHeartTreatment", "err-priorHeartTreatment"));

  ok.push(validateUserID($("userID"), "err-userID"));
  ok.push(validateEmailLike($("portalEmail"), "err-portalEmail", true, true));
  ok.push(validatePassword($("password"), "err-password"));
  ok.push(validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword"));

  return ok.every(Boolean);
}

function setSubmitEnabled(enabled) {
  const submitBtn = $("submitBtn");
  if (!submitBtn) return;
  submitBtn.disabled = !enabled;
}

function lockSubmitAfterEdits() {
  setSubmitEnabled(false);
  setMsg("validateStatus", "Form changed — press Validate again before Submit.");
}

function showReview() {
  const form = document.getElementById("patientForm");
  const panel = $("review-panel");
  if (!form || !panel) return;

  const firstName = form.elements["firstName"]?.value || "";
  const middleInit = form.elements["middleInit"]?.value || "";
  const lastName = form.elements["lastName"]?.value || "";
  const dob = form.elements["dob"]?.value || "";
  const email = form.elements["email"]?.value || "";
  const phone = form.elements["phone"]?.value || "";
  const address1 = form.elements["address1"]?.value || "";
  const address2 = form.elements["address2"]?.value || "";
  const city = form.elements["city"]?.value || "";
  const state = form.elements["state"]?.value || "";
  const zip = form.elements["zip"]?.value || "";
  const userID = form.elements["userID"]?.value || "";

  const ins = form.querySelector('input[name="insurance"]:checked');
  const insurance = ins ? ins.value : "";

  const providerSel = $("insuranceProvider");
  const otherProv = $("otherProvider");
  let providerText = "";
  if (insurance === "Yes" && providerSel) {
    providerText = providerSel.value === "Other"
      ? ((otherProv && otherProv.value.trim()) ? otherProv.value.trim() : "Other")
      : (providerSel.value || "");
  } else {
    providerText = "N/A";
  }

  const addrLine = [address1, address2].filter(Boolean).join(" ").trim();
  const cityStateZip = [city, state, zip].filter(Boolean).join(" ").trim();
  const fullAddress = [addrLine, cityStateZip].filter(Boolean).join(", ");

  const mi = (middleInit || "").trim();
  const midPart = mi ? mi + "." : "";
  const fullName = `${(firstName || "").trim()} ${midPart} ${(lastName || "").trim()}`.replace(/\s+/g, " ").trim();

  $("rv-name").textContent = fullName;
  $("rv-dob").textContent = dob;
  $("rv-email").textContent = email;
  $("rv-phone").textContent = phone;
  $("rv-address").textContent = fullAddress;
  $("rv-state").textContent = state;
  $("rv-zip").textContent = zip;
  $("rv-insurance").textContent = insurance || "Not selected";
  $("rv-provider").textContent = insurance === "Yes" ? (providerText || "Not selected") : "N/A";
  $("rv-userid").textContent = userID;

  panel.style.display = "block";
}

function wireInsurance() {
  const form = document.getElementById("patientForm");
  const radios = form.querySelectorAll('input[name="insurance"]');
  const provider = $("insuranceProvider");

  radios.forEach((r) => r.addEventListener("change", updateInsuranceFields));
  if (provider) provider.addEventListener("change", updateOtherProviderField);

  $("otherProvider")?.addEventListener("input", validateInsuranceProvider);
  $("otherProvider")?.addEventListener("blur", validateInsuranceProvider);

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      document.querySelectorAll(".field-invalid").forEach((el) => el.classList.remove("field-invalid"));
      document.querySelectorAll("#patientForm .field-msg").forEach((el) => (el.textContent = ""));
      $("review-panel").style.display = "none";
      setSubmitEnabled(false);
      setMsg("validateStatus", "");
      updateInsuranceFields();
      syncPainOutput();
    }, 0);
  });

  updateInsuranceFields();
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("patientForm");

  await loadStatesWithFetch();

  const today = $("todayDate");
  if (today) today.textContent = new Date().toDateString();

  const painLevel = $("painLevel");
  const painOutput = $("painOutput");
  if (painLevel && painOutput) {
    syncPainOutput();
    painLevel.addEventListener("input", () => {
      syncPainOutput();
      lockSubmitAfterEdits();
    });
  }

  $("firstName").addEventListener("input", () => { validateFirstLast($("firstName"), "err-firstName", "First name"); lockSubmitAfterEdits(); });
  $("firstName").addEventListener("blur", () => validateFirstLast($("firstName"), "err-firstName", "First name"));

  $("middleInit").addEventListener("input", () => { validateMiddle($("middleInit"), "err-middleInit"); lockSubmitAfterEdits(); });
  $("middleInit").addEventListener("blur", () => validateMiddle($("middleInit"), "err-middleInit"));

  $("lastName").addEventListener("input", () => { validateFirstLast($("lastName"), "err-lastName", "Last name"); lockSubmitAfterEdits(); });
  $("lastName").addEventListener("blur", () => validateFirstLast($("lastName"), "err-lastName", "Last name"));

  $("dob").addEventListener("input", () => { validateDOB($("dob"), "err-dob"); lockSubmitAfterEdits(); });
  $("dob").addEventListener("blur", () => validateDOB($("dob"), "err-dob"));

  $("ssn").addEventListener("input", () => {
    formatSSNWhileTyping($("ssn"));
    validateSSN($("ssn"), "err-ssn");
    lockSubmitAfterEdits();
  });
  $("ssn").addEventListener("blur", () => validateSSN($("ssn"), "err-ssn"));

  $("address1").addEventListener("input", () => { validateAddressLine($("address1"), "err-address1", "Address line 1", true); lockSubmitAfterEdits(); });
  $("address1").addEventListener("blur", () => validateAddressLine($("address1"), "err-address1", "Address line 1", true));

  $("address2").addEventListener("input", () => { validateAddressLine($("address2"), "err-address2", "Address line 2", false); lockSubmitAfterEdits(); });
  $("address2").addEventListener("blur", () => validateAddressLine($("address2"), "err-address2", "Address line 2", false));

  $("city").addEventListener("input", () => { validateCity($("city"), "err-city", true); lockSubmitAfterEdits(); });
  $("city").addEventListener("blur", () => validateCity($("city"), "err-city", true));

  $("state").addEventListener("change", () => { validateState($("state"), "err-state", true); lockSubmitAfterEdits(); });
  $("state").addEventListener("blur", () => validateState($("state"), "err-state", true));

  $("zip").addEventListener("input", () => { validateZip5($("zip"), "err-zip", true); lockSubmitAfterEdits(); });
  $("zip").addEventListener("blur", () => validateZip5($("zip"), "err-zip", true));

  $("email").addEventListener("input", () => { validateEmailLike($("email"), "err-email", true, true); lockSubmitAfterEdits(); });
  $("email").addEventListener("blur", () => validateEmailLike($("email"), "err-email", true, true));

  $("phone").addEventListener("input", () => {
    normalizePhoneAsYouType($("phone"));
    validatePhone10($("phone"), "err-phone", true);
    lockSubmitAfterEdits();
  });
  $("phone").addEventListener("blur", () => validatePhone10($("phone"), "err-phone", true));

  $("symptoms").addEventListener("input", () => { validateSymptoms($("symptoms"), "err-symptoms"); lockSubmitAfterEdits(); });
  $("symptoms").addEventListener("blur", () => validateSymptoms($("symptoms"), "err-symptoms"));

  wireRadioGroupLiveValidation("sex", "err-sex");
  wireRadioGroupLiveValidation("ethnicity", "err-ethnicity");
  wireRadioGroupLiveValidation("insurance", "err-insurance");
  wireRadioGroupLiveValidation("chestPain", "err-chestPain");
  wireRadioGroupLiveValidation("priorHeartTreatment", "err-priorHeartTreatment");

  form.querySelectorAll("input[type='radio']").forEach((r) => {
    r.addEventListener("change", lockSubmitAfterEdits);
  });
  form.querySelectorAll("input[type='checkbox']").forEach((c) => {
    c.addEventListener("change", lockSubmitAfterEdits);
  });

  $("emgFirstName").addEventListener("input", () => { validateFirstLast($("emgFirstName"), "err-emgFirstName", "First name"); lockSubmitAfterEdits(); });
  $("emgFirstName").addEventListener("blur", () => validateFirstLast($("emgFirstName"), "err-emgFirstName", "First name"));

  $("emgMiddleInit").addEventListener("input", () => { validateMiddle($("emgMiddleInit"), "err-emgMiddleInit"); lockSubmitAfterEdits(); });
  $("emgMiddleInit").addEventListener("blur", () => validateMiddle($("emgMiddleInit"), "err-emgMiddleInit"));

  $("emgLastName").addEventListener("input", () => { validateFirstLast($("emgLastName"), "err-emgLastName", "Last name"); lockSubmitAfterEdits(); });
  $("emgLastName").addEventListener("blur", () => validateFirstLast($("emgLastName"), "err-emgLastName", "Last name"));

  $("relationship").addEventListener("change", () => { validateRelationship($("relationship"), "err-relationship"); lockSubmitAfterEdits(); });

  $("emgAddress1").addEventListener("input", () => { validateAddressLine($("emgAddress1"), "err-emgAddress1", "Address line 1", true); lockSubmitAfterEdits(); });
  $("emgAddress1").addEventListener("blur", () => validateAddressLine($("emgAddress1"), "err-emgAddress1", "Address line 1", true));

  $("emgAddress2").addEventListener("input", () => { validateAddressLine($("emgAddress2"), "err-emgAddress2", "Address line 2", false); lockSubmitAfterEdits(); });
  $("emgAddress2").addEventListener("blur", () => validateAddressLine($("emgAddress2"), "err-emgAddress2", "Address line 2", false));

  $("emgCity").addEventListener("input", () => { validateCity($("emgCity"), "err-emgCity", false); lockSubmitAfterEdits(); });
  $("emgCity").addEventListener("blur", () => validateCity($("emgCity"), "err-emgCity", false));

  $("emgState").addEventListener("change", () => { validateState($("emgState"), "err-emgState", false); lockSubmitAfterEdits(); });
  $("emgZip").addEventListener("input", () => { validateZip5($("emgZip"), "err-emgZip", false); lockSubmitAfterEdits(); });
  $("emgZip").addEventListener("blur", () => validateZip5($("emgZip"), "err-emgZip", false));

  $("emgEmail").addEventListener("input", () => { validateEmailLike($("emgEmail"), "err-emgEmail", true, false); lockSubmitAfterEdits(); });
  $("emgEmail").addEventListener("blur", () => validateEmailLike($("emgEmail"), "err-emgEmail", true, false));

  $("emgPhone").addEventListener("input", () => {
    normalizePhoneAsYouType($("emgPhone"));
    validatePhone10($("emgPhone"), "err-emgPhone", false);
    lockSubmitAfterEdits();
  });
  $("emgPhone").addEventListener("blur", () => validatePhone10($("emgPhone"), "err-emgPhone", false));

  $("userID").addEventListener("input", () => {
    validateUserID($("userID"), "err-userID");
    validatePassword($("password"), "err-password");
    validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword");
    lockSubmitAfterEdits();
  });
  $("userID").addEventListener("blur", () => {
    validateUserID($("userID"), "err-userID");
    validatePassword($("password"), "err-password");
  });

  $("portalEmail").addEventListener("input", () => { validateEmailLike($("portalEmail"), "err-portalEmail", true, true); lockSubmitAfterEdits(); });
  $("portalEmail").addEventListener("blur", () => validateEmailLike($("portalEmail"), "err-portalEmail", true, true));

  $("password").addEventListener("input", () => {
    validatePassword($("password"), "err-password");
    validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword");
    lockSubmitAfterEdits();
  });
  $("password").addEventListener("blur", () => {
    validatePassword($("password"), "err-password");
    validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword");
  });

  $("confirmPassword").addEventListener("input", () => {
    validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword");
    lockSubmitAfterEdits();
  });
  $("confirmPassword").addEventListener("blur", () => validateConfirmPassword($("password"), $("confirmPassword"), "err-confirmPassword"));

  $("validateBtn")?.addEventListener("click", () => {
    const allOk = runFullValidation();
    if (allOk) {
      setSubmitEnabled(true);
      setMsg("validateStatus", "All checks passed — Submit is now enabled.");
    } else {
      setSubmitEnabled(false);
      setMsg("validateStatus", "Fix the highlighted errors, then press Validate again.");
    }
  });

  form.addEventListener("submit", (e) => {
    if ($("submitBtn").disabled) {
      e.preventDefault();
      return;
    }
    if (!runFullValidation()) {
      e.preventDefault();
      setSubmitEnabled(false);
      setMsg("validateStatus", "Submit blocked — validation failed. Fix errors and press Validate.");
    }
  });

  $("reviewBtn")?.addEventListener("click", showReview);
  $("clearBtn")?.addEventListener("click", () => {
    window.setTimeout(() => {
      $("review-panel").style.display = "none";
    }, 0);
  });

  wireInsurance();

  setSubmitEnabled(false);
  setMsg("validateStatus", "Press Validate to enable Submit.");
});
