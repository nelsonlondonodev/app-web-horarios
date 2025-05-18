// script.js

// --- 1. Elementos del DOM ---
const employeeNameInput = document.getElementById("employeeNameInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeListUl = document.getElementById("employeeList");
const scheduleBody = document.getElementById("scheduleBody");
const clearScheduleBtn = document.getElementById("clearScheduleBtn");

// --- 2. Variables de Estado Globales ---
let employees = []; // [{ id: 'uuid', name: 'Nombre Empleado' }]
// schedule: { 'Lunes': { 'Mañana': ['empId1', 'empId2'], 'Tarde': [], 'Noche': [] }, ... }
let schedule = {};
let selectedEmployeeId = null; // ID del empleado actualmente seleccionado para asignación

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const SHIFTS = [
  { name: "Mañana", time: "06:00 - 14:00" },
  { name: "Tarde", time: "14:00 - 22:00" },
  { name: "Noche", time: "22:00 - 06:00" },
];
const MAX_EMPLOYEES = 50; // Límite de empleados según la solicitud

// --- 3. Funciones de Utilidad ---

/**
 * Genera un ID único para los empleados.
 * @returns {string} Un UUID v4.
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Carga los datos de empleados y horarios desde localStorage.
 */
function loadData() {
  const storedEmployees = localStorage.getItem("employees");
  const storedSchedule = localStorage.getItem("schedule");

  if (storedEmployees) {
    employees = JSON.parse(storedEmployees);
  }
  if (storedSchedule) {
    schedule = JSON.parse(storedSchedule);
  } else {
    // Inicializar el horario si no existe
    initializeSchedule();
  }
}

/**
 * Guarda los datos de empleados y horarios en localStorage.
 */
function saveData() {
  localStorage.setItem("employees", JSON.stringify(employees));
  localStorage.setItem("schedule", JSON.stringify(schedule));
}

/**
 * Inicializa la estructura del objeto schedule para cada día y turno.
 */
function initializeSchedule() {
  DAYS_OF_WEEK.forEach((day) => {
    schedule[day] = {};
    SHIFTS.forEach((shift) => {
      schedule[day][shift.name] = []; // Array vacío para IDs de empleados
    });
  });
  saveData();
}

/**
 * Muestra un mensaje de alerta.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - Tipo de mensaje ('success', 'error', 'info').
 */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-transform duration-300 transform translate-x-full opacity-0`;

  if (type === "success") {
    toast.classList.add("bg-green-500");
  } else if (type === "error") {
    toast.classList.add("bg-red-500");
  } else {
    toast.classList.add("bg-blue-500"); // Default info
  }

  toast.textContent = message;
  document.body.appendChild(toast);

  // Animación de entrada
  setTimeout(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
    toast.classList.add("translate-x-0", "opacity-100");
  }, 10);

  // Animación de salida y eliminación
  setTimeout(() => {
    toast.classList.remove("translate-x-0", "opacity-100");
    toast.classList.add("translate-x-full", "opacity-0");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

// --- 4. Funciones de Renderizado de la UI ---

/**
 * Renderiza la lista de empleados en el aside.
 */
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

    const employeeNameSpan = document.createElement("span");
    employeeNameSpan.textContent = employee.name;
    li.appendChild(employeeNameSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML =
      '<i class="fas fa-times text-red-400 hover:text-red-600"></i>';
    deleteBtn.className =
      "ml-4 p-1 rounded-full hover:bg-red-100 transition-colors";
    deleteBtn.onclick = (e) => {
      e.stopPropagation(); // Evita que se seleccione el empleado al hacer clic en eliminar
      deleteEmployee(employee.id);
    };
    li.appendChild(deleteBtn);

    li.onclick = () => selectEmployee(employee.id);
    employeeListUl.appendChild(li);
  });
}

/**
 * Renderiza la cuadrícula de horarios.
 */
function renderScheduleGrid() {
  scheduleBody.innerHTML = ""; // Limpiar el cuerpo de la tabla

  SHIFTS.forEach((shift) => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-gold-500";

    // Celda del nombre del turno
    const thShift = document.createElement("th");
    thShift.className =
      "py-3 px-4 text-left font-semibold bg-gold-100 text-dark-brown";
    thShift.innerHTML = `<i class="fas fa-clock mr-2 text-gold-500"></i>${shift.name}<br><span class="text-xs text-light-brown font-normal">${shift.time}</span>`;
    tr.appendChild(thShift);

    // Celdas de los días
    DAYS_OF_WEEK.forEach((day) => {
      const td = document.createElement("td");
      td.className = "py-3 px-4 border border-gold-100 relative";
      td.setAttribute("data-day", day);
      td.setAttribute("data-shift", shift.name);

      // Mostrar empleados asignados a este turno y día
      const assignedEmployeeIds = schedule[day][shift.name] || [];
      assignedEmployeeIds.forEach((empId) => {
        const employee = employees.find((e) => e.id === empId);
        if (employee) {
          const tag = document.createElement("span");
          tag.className = "assigned-employee-tag";
          tag.textContent = employee.name;
          tag.setAttribute("data-employee-id", empId);
          tag.onclick = (e) => {
            e.stopPropagation(); // Evita que se asigne al hacer clic en el nombre para desasignar
            unassignEmployee(empId, day, shift.name);
          };
          td.appendChild(tag);
        }
      });

      // Contador de empleados en el turno
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

/**
 * Añade un nuevo empleado a la lista.
 */
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

/**
 * Elimina un empleado por su ID.
 * También lo desasigna de cualquier turno en el horario.
 * @param {string} employeeId - ID del empleado a eliminar.
 */
function deleteEmployee(employeeId) {
  // Desasignar al empleado de todos los turnos
  DAYS_OF_WEEK.forEach((day) => {
    SHIFTS.forEach((shift) => {
      schedule[day][shift.name] = schedule[day][shift.name].filter(
        (id) => id !== employeeId
      );
    });
  });

  // Eliminar al empleado de la lista
  employees = employees.filter((emp) => emp.id !== employeeId);

  // Deseleccionar si el empleado eliminado estaba seleccionado
  if (selectedEmployeeId === employeeId) {
    selectedEmployeeId = null;
  }

  saveData();
  renderEmployeeList();
  renderScheduleGrid();
  showToast("Empleado eliminado y desasignado de todos los turnos.", "info");
}

/**
 * Selecciona un empleado para su asignación.
 * @param {string} employeeId - ID del empleado a seleccionar.
 */
function selectEmployee(employeeId) {
  if (selectedEmployeeId === employeeId) {
    selectedEmployeeId = null; // Deseleccionar si se hace clic de nuevo
    showToast("Empleado deseleccionado.", "info");
  } else {
    selectedEmployeeId = employeeId;
    const employeeName =
      employees.find((emp) => emp.id === employeeId)?.name || "Desconocido";
    showToast(`"${employeeName}" seleccionado para asignar.`, "info");
  }
  renderEmployeeList(); // Volver a renderizar para actualizar el estilo de selección
}

/**
 * Asigna el empleado seleccionado a un turno específico.
 * @param {string} day - Día de la semana.
 * @param {string} shiftName - Nombre del turno.
 */
function assignSelectedEmployee(day, shiftName) {
  if (!selectedEmployeeId) {
    showToast("Por favor, selecciona un empleado primero.", "error");
    return;
  }

  const employeeToAssign = employees.find(
    (emp) => emp.id === selectedEmployeeId
  );
  if (!employeeToAssign) {
    showToast("Empleado seleccionado no encontrado.", "error");
    selectedEmployeeId = null; // Limpiar selección inválida
    renderEmployeeList();
    return;
  }

  const currentShiftAssignments = schedule[day][shiftName];

  // Verificar si el empleado ya está en este turno
  if (currentShiftAssignments.includes(selectedEmployeeId)) {
    showToast(`"${employeeToAssign.name}" ya está en este turno.`, "info");
    return;
  }

  // Verificar si el empleado ya está en otro turno el mismo día
  for (const s of SHIFTS) {
    if (
      s.name !== shiftName &&
      schedule[day][s.name].includes(selectedEmployeeId)
    ) {
      showToast(
        `"${employeeToAssign.name}" ya está asignado al turno de ${s.name} el ${day}. Desasígnalo primero.`,
        "error"
      );
      return;
    }
  }

  // Asignar empleado
  schedule[day][shiftName].push(selectedEmployeeId);
  saveData();
  renderScheduleGrid();
  showToast(
    `"${employeeToAssign.name}" asignado a ${shiftName} el ${day}.`,
    "success"
  );
  selectedEmployeeId = null; // Deseleccionar después de asignar
  renderEmployeeList();
}

/**
 * Desasigna un empleado de un turno específico.
 * @param {string} employeeId - ID del empleado a desasignar.
 * @param {string} day - Día de la semana.
 * @param {string} shiftName - Nombre del turno.
 */
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

/**
 * Limpia todo el horario, desasignando a todos los empleados.
 */
function clearAllSchedule() {
  if (
    confirm(
      "¿Estás seguro de que quieres limpiar todo el horario? Esta acción no se puede deshacer."
    )
  ) {
    initializeSchedule(); // Reinicializa el objeto schedule
    renderScheduleGrid();
    showToast("Todo el horario ha sido limpiado.", "success");
  }
}

// --- 6. Inicialización y Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderEmployeeList();
  renderScheduleGrid(); // Asegura que la cuadrícula se renderiza con los datos cargados
});

addEmployeeBtn.addEventListener("click", addEmployee);
employeeNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addEmployee();
  }
});
clearScheduleBtn.addEventListener("click", clearAllSchedule);
