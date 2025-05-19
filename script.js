// script.js

// --- 1. Elementos del DOM (No hay cambios aquí) ---
const employeeNameInput = document.getElementById("employeeNameInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeListUl = document.getElementById("employeeList");
const scheduleBody = document.getElementById("scheduleBody");
const clearScheduleBtn = document.getElementById("clearScheduleBtn");

// --- 2. Variables de Estado Globales ---
let employees = [];
let schedule = {};
let selectedEmployeeId = null; // Mantenemos esta variable para la funcionalidad de clic-y-asignar

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const SHIFTS = [
  { name: "Mañana", time: "06:00 - 14:00" },
  { name: "Tarde", time: "14:00 - 22:00" },
  { name: "Noche", time: "22:00 - 06:00" },
];
const MAX_EMPLOYEES = 50;

// --- 3. Funciones de Utilidad (No hay cambios aquí, excepto showToast que ya estaba) ---

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

// --- 4. Funciones de Renderizado de la UI (MODIFICADAS) ---

/**
 * Renderiza la lista de empleados en el aside.
 * Ahora añade el atributo draggable y los event listeners de drag.
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
    li.setAttribute("draggable", "true"); // ¡Hacemos el elemento arrastrable!

    // Evento de inicio de arrastre
    li.addEventListener("dragstart", handleDragStart);
    // Evento de fin de arrastre (para limpieza de estilos)
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

    // Mantenemos la funcionalidad de clic para seleccionar
    li.onclick = () => selectEmployee(employee.id);
    employeeListUl.appendChild(li);
  });
}

/**
 * Renderiza la cuadrícula de horarios.
 * Ahora añade los event listeners de drag para las celdas de destino.
 */
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

      // ¡Añadimos los event listeners de arrastre y soltado a las celdas!
      td.addEventListener("dragover", handleDragOver);
      td.addEventListener("dragleave", handleDragLeave);
      td.addEventListener("drop", handleDrop);

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

      // Mantenemos la funcionalidad de clic para asignar (usando el empleado seleccionado)
      td.onclick = () => assignSelectedEmployee(day, shift.name);
      tr.appendChild(td);
    });
    scheduleBody.appendChild(tr);
  });
}

// --- 5. Funciones de Gestión de Datos y Eventos (MODIFICADAS Y AÑADIDAS) ---

// Refactorizamos la lógica central de asignación en una función reutilizable
/**
 * Intenta asignar un empleado a un turno, con detección de conflictos.
 * @param {string} employeeId - ID del empleado a asignar.
 * @param {string} day - Día de la semana.
 * @param {string} shiftName - Nombre del turno.
 * @returns {boolean} True si la asignación fue exitosa, false si hubo un conflicto.
 */
function attemptAssignEmployee(employeeId, day, shiftName) {
  const employeeToAssign = employees.find((emp) => emp.id === employeeId);
  if (!employeeToAssign) {
    showToast("Empleado no encontrado.", "error");
    return false;
  }

  const currentShiftAssignments = schedule[day][shiftName];

  // 1. Verificar si el empleado ya está en este turno
  if (currentShiftAssignments.includes(employeeId)) {
    showToast(`"${employeeToAssign.name}" ya está en este turno.`, "info");
    return false;
  }

  // 2. Verificar si el empleado ya está en otro turno el mismo día (Detección de Conflictos)
  for (const s of SHIFTS) {
    if (s.name !== shiftName && schedule[day][s.name].includes(employeeId)) {
      showToast(
        `"${employeeToAssign.name}" ya está asignado al turno de ${s.name} el ${day}. Desasígnalo primero.`,
        "error"
      );
      return false;
    }
  }

  // Si no hay conflictos, proceder con la asignación
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

/**
 * Selecciona un empleado para su asignación con clic.
 * @param {string} employeeId - ID del empleado a seleccionar.
 */
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

/**
 * Asigna el empleado seleccionado por clic a un turno específico.
 * Llama a la nueva función centralizada de asignación.
 * @param {string} day - Día de la semana.
 * @param {string} shiftName - Nombre del turno.
 */
function assignSelectedEmployee(day, shiftName) {
  if (!selectedEmployeeId) {
    showToast("Por favor, selecciona un empleado primero.", "error");
    return;
  }

  const assigned = attemptAssignEmployee(selectedEmployeeId, day, shiftName);
  if (assigned) {
    selectedEmployeeId = null; // Deseleccionar después de asignar si fue exitoso
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

// --- NUEVAS FUNCIONES PARA DRAG-AND-DROP ---

let draggedEmployeeId = null; // Variable para almacenar el ID del empleado que se está arrastrando

/**
 * Manejador del evento dragstart (cuando un elemento empieza a arrastrarse).
 * @param {Event} event - El evento de arrastre.
 */
function handleDragStart(event) {
  // Obtenemos el ID del empleado desde el atributo data-employee-id del li
  draggedEmployeeId = event.target.dataset.employeeId;
  // Establecemos los datos a transferir (ID del empleado)
  event.dataTransfer.setData("text/plain", draggedEmployeeId);
  // Añadimos una clase visual para indicar que el elemento se está arrastrando
  event.target.classList.add("dragging");
  showToast(
    `Arrastrando a "${
      employees.find((e) => e.id === draggedEmployeeId)?.name
    }"...`,
    "info"
  );
}

/**
 * Manejador del evento dragover (cuando un elemento arrastrado pasa por encima de un objetivo).
 * @param {Event} event - El evento de arrastre.
 */
function handleDragOver(event) {
  event.preventDefault(); // ¡Esto es crucial para permitir que se pueda soltar el elemento!
  // Añadimos una clase visual para resaltar el objetivo de soltado
  event.target.classList.add("drag-over");
}

/**
 * Manejador del evento dragleave (cuando un elemento arrastrado sale de un objetivo).
 * @param {Event} event - El evento de arrastre.
 */
function handleDragLeave(event) {
  // Removemos la clase visual cuando el elemento arrastrado sale del objetivo
  event.target.classList.remove("drag-over");
}

/**
 * Manejador del evento drop (cuando un elemento arrastrado se suelta sobre un objetivo).
 * @param {Event} event - El evento de arrastre.
 */
function handleDrop(event) {
  event.preventDefault(); // Prevenimos el comportamiento por defecto (ej. abrir como enlace)
  // Removemos la clase visual del objetivo
  event.target.classList.remove("drag-over");

  // Obtenemos el ID del empleado que fue arrastrado
  const employeeIdToAssign = event.dataTransfer.getData("text/plain");
  // Obtenemos el día y el turno de la celda donde se soltó el empleado
  const day = event.target.dataset.day;
  const shiftName = event.target.dataset.shift;

  if (employeeIdToAssign && day && shiftName) {
    // Llamamos a nuestra función centralizada de asignación
    attemptAssignEmployee(employeeIdToAssign, day, shiftName);
  }
  draggedEmployeeId = null; // Limpiamos el ID del empleado arrastrado
}

/**
 * Manejador del evento dragend (cuando la operación de arrastre finaliza).
 * @param {Event} event - El evento de arrastre.
 */
function handleDragEnd(event) {
  // Removemos la clase visual del elemento que se estaba arrastrando
  event.target.classList.remove("dragging");
  // Si hay un elemento resaltado por drag-over que no se limpió (ej. se soltó fuera)
  // podemos limpiar cualquier celda que aún tenga la clase 'drag-over'
  document
    .querySelectorAll(".drag-over")
    .forEach((el) => el.classList.remove("drag-over"));
}

// --- 6. Inicialización y Event Listeners (No hay cambios aquí, excepto que ahora renderizan con los nuevos eventos) ---

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
