// script.js

// --- 1. Elementos del DOM ---
const employeeNameInput = document.getElementById("employeeNameInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeListUl = document.getElementById("employeeList");
const scheduleBody = document.getElementById("scheduleBody");
const clearScheduleBtn = document.getElementById("clearScheduleBtn");
const generateReportBtn = document.getElementById("generateReportBtn"); // Nuevo: Botón de reporte

// Nuevo: Elementos del DOM para el Modal de Reportes
const reportModal = document.getElementById("reportModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const reportModalTitle = document.getElementById("reportModalTitle");
const reportModalContent = document.getElementById("reportModalContent");

// --- 2. Variables de Estado Globales ---
let employees = [];
let schedule = {};
let selectedEmployeeId = null;

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const SHIFTS = [
  { name: "Mañana", time: "06:00 - 14:00" },
  { name: "Tarde", time: "14:00 - 22:00" },
  { name: "Noche", time: "22:00 - 06:00" },
];
const MAX_EMPLOYEES = 50;

// --- 3. Funciones de Utilidad ---

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadData() {
  const storedEmployees = localStorage.getItem("employees");
  const storedSchedule = localStorage.getItem("schedule");

  if (storedEmployees) {
    employees = JSON.parse(storedEmployees);
  }
  if (storedSchedule) {
    schedule = JSON.parse(storedSchedule);
  } else {
    initializeSchedule();
  }
}

function saveData() {
  localStorage.setItem("employees", JSON.stringify(employees));
  localStorage.setItem("schedule", JSON.stringify(schedule));
}

function initializeSchedule() {
  DAYS_OF_WEEK.forEach((day) => {
    schedule[day] = {};
    SHIFTS.forEach((shift) => {
      schedule[day][shift.name] = [];
    });
  });
  saveData();
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-transform duration-300 transform translate-x-full opacity-0`;

  if (type === "success") {
    toast.classList.add("bg-green-500");
  } else if (type === "error") {
    toast.classList.add("bg-red-500");
  } else {
    toast.classList.add("bg-blue-500");
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
    toast.classList.add("translate-x-0", "opacity-100");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("translate-x-0", "opacity-100");
    toast.classList.add("translate-x-full", "opacity-0");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

// --- 4. Funciones de Renderizado de la UI ---

function renderEmployeeList() {
  employeeListUl.innerHTML = "";
  employees.forEach((employee) => {
    const li = document.createElement("li");
    li.id = `employee-${employee.id}`;
    li.className = `flex items-center justify-between p-3 rounded-md cursor-pointer transition duration-200 ease-in-out
                        ${
                          selectedEmployeeId === employee.id
                            ? "bg-gold-500 text-white shadow-md"
                            : "bg-white hover:bg-primary-cream"
                        }`;
    li.setAttribute("data-employee-id", employee.id);
    li.setAttribute("draggable", "true");

    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragend", handleDragEnd);

    const employeeNameSpan = document.createElement("span");
    employeeNameSpan.textContent = employee.name;
    li.appendChild(employeeNameSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML =
      '<i class="fas fa-times text-red-400 hover:text-red-600"></i>';
    deleteBtn.className =
      "ml-4 p-1 rounded-full hover:bg-red-100 transition-colors";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteEmployee(employee.id);
    };
    li.appendChild(deleteBtn);

    li.onclick = () => selectEmployee(employee.id);
    employeeListUl.appendChild(li);
  });
}

function renderScheduleGrid() {
  scheduleBody.innerHTML = "";

  SHIFTS.forEach((shift) => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-gold-500";

    const thShift = document.createElement("th");
    thShift.className =
      "py-3 px-4 text-left font-semibold bg-gold-100 text-dark-brown";
    thShift.innerHTML = `<i class="fas fa-clock mr-2 text-gold-500"></i>${shift.name}<br><span class="text-xs text-light-brown font-normal">${shift.time}</span>`;
    tr.appendChild(thShift);

    DAYS_OF_WEEK.forEach((day) => {
      const td = document.createElement("td");
      td.className = "py-3 px-4 border border-gold-100 relative";
      td.setAttribute("data-day", day);
      td.setAttribute("data-shift", shift.name);

      td.addEventListener("dragover", handleDragOver);
      td.addEventListener("dragleave", handleDragLeave);
      td.addEventListener("drop", handleDrop);

      const assignedEmployeeIds = schedule[day][shift.name] || [];
      assignedEmployeeIds.forEach((empId) => {
        const employee = employees.find((e) => e.id === empId);
        if (employee) {
          const tag = document.createElement("span");
          tag.className = "assigned-employee-tag";
          tag.textContent = employee.name;
          tag.setAttribute("data-employee-id", empId);
          tag.onclick = (e) => {
            e.stopPropagation();
            unassignEmployee(empId, day, shift.name);
          };
          td.appendChild(tag);
        }
      });

      const countSpan = document.createElement("span");
      countSpan.className =
        "absolute bottom-1 right-2 text-xs font-semibold text-dark-brown";
      countSpan.textContent = `(${assignedEmployeeIds.length})`;
      td.appendChild(countSpan);

      td.onclick = () => assignSelectedEmployee(day, shift.name);
      tr.appendChild(td);
    });
    scheduleBody.appendChild(tr);
  });
}

// --- 5. Funciones de Gestión de Datos y Eventos ---

function attemptAssignEmployee(employeeId, day, shiftName) {
  const employeeToAssign = employees.find((emp) => emp.id === employeeId);
  if (!employeeToAssign) {
    showToast("Empleado no encontrado.", "error");
    return false;
  }

  const currentShiftAssignments = schedule[day][shiftName];

  if (currentShiftAssignments.includes(employeeId)) {
    showToast(`"${employeeToAssign.name}" ya está en este turno.`, "info");
    return false;
  }

  for (const s of SHIFTS) {
    if (s.name !== shiftName && schedule[day][s.name].includes(employeeId)) {
      showToast(
        `"${employeeToAssign.name}" ya está asignado al turno de ${s.name} el ${day}. Desasígnalo primero.`,
        "error"
      );
      return false;
    }
  }

  schedule[day][shiftName].push(employeeId);
  saveData();
  renderScheduleGrid();
  showToast(
    `"${employeeToAssign.name}" asignado a ${shiftName} el ${day}.`,
    "success"
  );
  return true;
}

function addEmployee() {
  const name = employeeNameInput.value.trim();
  if (name && employees.length < MAX_EMPLOYEES) {
    const newEmployee = { id: generateUUID(), name: name };
    employees.push(newEmployee);
    saveData();
    renderEmployeeList();
    employeeNameInput.value = "";
    showToast(`"${name}" añadido.`, "success");
  } else if (employees.length >= MAX_EMPLOYEES) {
    showToast(`Máximo de ${MAX_EMPLOYEES} empleados alcanzado.`, "error");
  } else {
    showToast("Por favor, introduce un nombre para el empleado.", "error");
  }
}

function deleteEmployee(employeeId) {
  DAYS_OF_WEEK.forEach((day) => {
    SHIFTS.forEach((shift) => {
      schedule[day][shift.name] = schedule[day][shift.name].filter(
        (id) => id !== employeeId
      );
    });
  });

  employees = employees.filter((emp) => emp.id !== employeeId);

  if (selectedEmployeeId === employeeId) {
    selectedEmployeeId = null;
  }

  saveData();
  renderEmployeeList();
  renderScheduleGrid();
  showToast("Empleado eliminado y desasignado de todos los turnos.", "info");
}

function selectEmployee(employeeId) {
  if (selectedEmployeeId === employeeId) {
    selectedEmployeeId = null;
    showToast("Empleado deseleccionado.", "info");
  } else {
    selectedEmployeeId = employeeId;
    const employeeName =
      employees.find((emp) => emp.id === employeeId)?.name || "Desconocido";
    showToast(
      `"${employeeName}" seleccionado para asignar (haz clic en una celda de turno).`,
      "info"
    );
  }
  renderEmployeeList();
}

function assignSelectedEmployee(day, shiftName) {
  if (!selectedEmployeeId) {
    showToast("Por favor, selecciona un empleado primero.", "error");
    return;
  }

  const assigned = attemptAssignEmployee(selectedEmployeeId, day, shiftName);
  if (assigned) {
    selectedEmployeeId = null;
    renderEmployeeList();
  }
}

function unassignEmployee(employeeId, day, shiftName) {
  const employeeName =
    employees.find((emp) => emp.id === employeeId)?.name || "Desconocido";
  schedule[day][shiftName] = schedule[day][shiftName].filter(
    (id) => id !== employeeId
  );
  saveData();
  renderScheduleGrid();
  showToast(`"${employeeName}" desasignado de ${shiftName} el ${day}.`, "info");
}

function clearAllSchedule() {
  if (
    confirm(
      "¿Estás seguro de que quieres limpiar todo el horario? Esta acción no se puede deshacer."
    )
  ) {
    initializeSchedule();
    renderScheduleGrid();
    showToast("Todo el horario ha sido limpiado.", "success");
  }
}

// --- FUNCIONES PARA DRAG-AND-DROP ---

let draggedEmployeeId = null;

function handleDragStart(event) {
  draggedEmployeeId = event.target.dataset.employeeId;
  event.dataTransfer.setData("text/plain", draggedEmployeeId);
  event.target.classList.add("dragging");
  showToast(
    `Arrastrando a "${
      employees.find((e) => e.id === draggedEmployeeId)?.name
    }"...`,
    "info"
  );
}

function handleDragOver(event) {
  event.preventDefault();
  event.target.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.target.classList.remove("drag-over");
}

function handleDrop(event) {
  event.preventDefault();
  event.target.classList.remove("drag-over");

  const employeeIdToAssign = event.dataTransfer.getData("text/plain");
  const day = event.target.dataset.day;
  const shiftName = event.target.dataset.shift;

  if (employeeIdToAssign && day && shiftName) {
    attemptAssignEmployee(employeeIdToAssign, day, shiftName);
  }
  draggedEmployeeId = null;
}

function handleDragEnd(event) {
  event.target.classList.remove("dragging");
  document
    .querySelectorAll(".drag-over")
    .forEach((el) => el.classList.remove("drag-over"));
}

// --- NUEVAS FUNCIONES PARA REPORTES ---

/**
 * Muestra la modal de reportes con las opciones iniciales.
 */
function showReportModal() {
  reportModalTitle.textContent = "Generar Reporte";
  reportModalContent.innerHTML = `
        <div class="space-y-4">
            <button id="reportOverallBtn" class="report-option-btn"><i class="fas fa-calendar-week mr-2"></i> Reporte General Semanal</button>
            <button id="reportByEmployeeBtn" class="report-option-btn"><i class="fas fa-user mr-2"></i> Reporte por Empleado</button>
            <button id="reportByShiftBtn" class="report-option-btn"><i class="fas fa-clock mr-2"></i> Reporte por Turno</button>
        </div>
    `;
  reportModal.classList.add("active"); // Muestra la modal

  // Añadir event listeners a los nuevos botones
  document
    .getElementById("reportOverallBtn")
    .addEventListener("click", generateOverallScheduleReport);
  document
    .getElementById("reportByEmployeeBtn")
    .addEventListener("click", showEmployeeSelectionForReport);
  document
    .getElementById("reportByShiftBtn")
    .addEventListener("click", showShiftSelectionForReport);
}

/**
 * Oculta la modal de reportes.
 */
function hideReportModal() {
  reportModal.classList.remove("active"); // Oculta la modal
  // Resetear contenido del modal después de la transición para evitar flashes
  setTimeout(() => {
    reportModalContent.innerHTML = "";
    reportModalTitle.textContent = "Generar Reporte";
  }, 300); // Duración de la transición CSS
}

/**
 * Genera y muestra un reporte general de todo el horario semanal.
 */
function generateOverallScheduleReport() {
  reportModalTitle.textContent = "Reporte General Semanal";
  let reportHtml = "<div>";

  DAYS_OF_WEEK.forEach((day) => {
    reportHtml += `<div class="report-section mb-4"><h4>${day}</h4>`;
    SHIFTS.forEach((shift) => {
      const assignedEmployees = schedule[day][shift.name]
        .map(
          (empId) =>
            employees.find((e) => e.id === empId)?.name ||
            "Empleado Desconocido"
        )
        .join(", ");

      reportHtml += `<p class="ml-4"><span class="font-semibold">${
        shift.name
      } (${shift.time}):</span> ${
        assignedEmployees || "Ningún empleado asignado"
      }</p>`;
    });
    reportHtml += "</div>";
  });

  reportHtml += `
        <div class="flex justify-start mt-6">
            <button class="report-back-btn" onclick="showReportModal()">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Opciones
            </button>
        </div>
    </div>`;
  reportModalContent.innerHTML = reportHtml;
}

/**
 * Muestra la lista de empleados para seleccionar un reporte individual.
 */
function showEmployeeSelectionForReport() {
  reportModalTitle.textContent = "Seleccionar Empleado para Reporte";
  let employeeListHtml = "<ul>";
  employees.forEach((emp) => {
    employeeListHtml += `<li class="report-option-list-item" data-employee-id="${emp.id}">${emp.name}</li>`;
  });
  employeeListHtml += `</ul>
        <div class="flex justify-start mt-6">
            <button class="report-back-btn" onclick="showReportModal()">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Opciones
            </button>
        </div>
    `;
  reportModalContent.innerHTML = employeeListHtml;

  // Añadir event listeners a los ítems de la lista de empleados
  document.querySelectorAll(".report-option-list-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const employeeId = e.currentTarget.dataset.employeeId;
      generateEmployeeSpecificReport(employeeId);
    });
  });
}

/**
 * Genera y muestra un reporte para un empleado específico.
 * @param {string} employeeId - ID del empleado a reportar.
 */
function generateEmployeeSpecificReport(employeeId) {
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) {
    reportModalContent.innerHTML =
      '<p class="text-red-500">Empleado no encontrado.</p>';
    return;
  }

  reportModalTitle.textContent = `Reporte de Horario para ${employee.name}`;
  let reportHtml = "<div>";
  let hasAssignments = false;

  DAYS_OF_WEEK.forEach((day) => {
    let dayAssignments = [];
    SHIFTS.forEach((shift) => {
      if (schedule[day][shift.name].includes(employeeId)) {
        dayAssignments.push(shift.name);
        hasAssignments = true;
      }
    });

    reportHtml += `<div class="report-section mb-2"><h4>${day}:</h4>`;
    if (dayAssignments.length > 0) {
      reportHtml += `<p class="ml-4">${dayAssignments.join(", ")}</p>`;
    } else {
      reportHtml += `<p class="ml-4 text-gray-500">Ningún turno asignado.</p>`;
    }
    reportHtml += "</div>";
  });

  if (!hasAssignments) {
    reportHtml = `<p class="text-center my-8">Este empleado no tiene turnos asignados para la semana.</p>`;
  }

  reportHtml += `
        <div class="flex justify-start mt-6">
            <button class="report-back-btn" onclick="showEmployeeSelectionForReport()">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Empleados
            </button>
        </div>
    </div>`;
  reportModalContent.innerHTML = reportHtml;
}

/**
 * Muestra la lista de turnos para seleccionar un reporte individual.
 */
function showShiftSelectionForReport() {
  reportModalTitle.textContent = "Seleccionar Turno para Reporte";
  let shiftListHtml = "<ul>";
  SHIFTS.forEach((shift) => {
    shiftListHtml += `<li class="report-option-list-item" data-shift-name="${shift.name}">${shift.name} (${shift.time})</li>`;
  });
  shiftListHtml += `</ul>
        <div class="flex justify-start mt-6">
            <button class="report-back-btn" onclick="showReportModal()">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Opciones
            </button>
        </div>
    `;
  reportModalContent.innerHTML = shiftListHtml;

  // Añadir event listeners a los ítems de la lista de turnos
  document.querySelectorAll(".report-option-list-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const shiftName = e.currentTarget.dataset.shiftName;
      generateShiftSpecificReport(shiftName);
    });
  });
}

/**
 * Genera y muestra un reporte para un turno específico.
 * @param {string} shiftName - Nombre del turno a reportar.
 */
function generateShiftSpecificReport(shiftName) {
  const shift = SHIFTS.find((s) => s.name === shiftName);
  if (!shift) {
    reportModalContent.innerHTML =
      '<p class="text-red-500">Turno no encontrado.</p>';
    return;
  }

  reportModalTitle.textContent = `Reporte de Empleados en Turno "${shift.name}"`;
  let reportHtml = "<div>";
  let hasAssignments = false;

  DAYS_OF_WEEK.forEach((day) => {
    const assignedEmployeeIds = schedule[day][shift.name] || [];
    const employeeNames = assignedEmployeeIds
      .map(
        (empId) =>
          employees.find((e) => e.id === empId)?.name || "Empleado Desconocido"
      )
      .join(", ");

    reportHtml += `<div class="report-section mb-2"><h4>${day}:</h4>`;
    if (employeeNames) {
      reportHtml += `<p class="ml-4">${employeeNames}</p>`;
      hasAssignments = true;
    } else {
      reportHtml += `<p class="ml-4 text-gray-500">Ningún empleado asignado.</p>`;
    }
    reportHtml += "</div>";
  });

  if (!hasAssignments) {
    reportHtml = `<p class="text-center my-8">Ningún empleado asignado a este turno durante la semana.</p>`;
  }

  reportHtml += `
        <div class="flex justify-start mt-6">
            <button class="report-back-btn" onclick="showShiftSelectionForReport()">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Turnos
            </button>
        </div>
    </div>`;
  reportModalContent.innerHTML = reportHtml;
}

// --- 6. Inicialización y Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderEmployeeList();
  renderScheduleGrid();
});

addEmployeeBtn.addEventListener("click", addEmployee);
employeeNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addEmployee();
  }
});
clearScheduleBtn.addEventListener("click", clearAllSchedule);

// Nuevos Event Listeners para el sistema de reportes
generateReportBtn.addEventListener("click", showReportModal);
closeModalBtn.addEventListener("click", hideReportModal);
