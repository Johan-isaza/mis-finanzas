// ---------- Elementos de la página ----------
const formulario = document.getElementById("formulario");
const lista = document.getElementById("lista");
const inputFecha = document.getElementById("fecha");
const inputMonto = document.getElementById("monto");
const inputNota = document.getElementById("nota");
const selectCategoria = document.getElementById("categoria");
const textoBalance = document.getElementById("balance");
const textoIngresos = document.getElementById("total-ingresos");
const textoGastos = document.getElementById("total-gastos");
const avisoRespaldo = document.getElementById("aviso-respaldo");

const inputMes = document.getElementById("mes");
const filtroCategoria = document.getElementById("filtro-categoria");
const todoHistorial = document.getElementById("todo-historial");

const hoja = document.getElementById("hoja");
const formEditar = document.getElementById("form-editar");
const editMonto = document.getElementById("edit-monto");
const editCategoria = document.getElementById("edit-categoria");
const editFecha = document.getElementById("edit-fecha");
const editNota = document.getElementById("edit-nota");

const toast = document.getElementById("toast");
const toastTexto = document.getElementById("toast-texto");
const toastAccion = document.getElementById("toast-accion");

const archivoImportar = document.getElementById("archivo-importar");

const COLORES_INGRESO = ["#16a34a", "#34d399", "#86efac", "#a7f3d0"];
const COLORES_GASTO = ["#ef4444", "#f97316", "#f59e0b", "#fb7185", "#fdba74", "#fca5a5"];

// ---------- Datos ----------
const CLAVE = "finanzas-datos";

function datosVacios() {
  return {
    version: 2,
    movimientos: [],
    categorias: {
      gasto: ["Comida", "Transporte", "Hogar", "Salud", "Ocio", "Otro"],
      ingreso: ["Salario", "Otro"]
    },
    presupuestos: {},
    cuentas: [],
    metas: [],
    recurrentes: [],
    ultimoRespaldo: null
  };
}

// Revisa que lo que viene (guardado o importado) tenga la forma correcta
function normalizar(obj) {
  if (!obj || !Array.isArray(obj.movimientos)) return null;
  const base = datosVacios();
  const cats = obj.categorias || {};

  return {
    version: 2,
    movimientos: obj.movimientos
      .filter(function (m) {
        return (
          m &&
          (m.tipo === "gasto" || m.tipo === "ingreso") &&
          Number(m.monto) > 0 &&
          typeof m.fecha === "string"
        );
      })
      .map(function (m, i) {
        return {
          id: m.id || Date.now() + i,
          tipo: m.tipo,
          monto: Number(m.monto),
          categoria: String(m.categoria || "Otro"),
          fecha: m.fecha,
          nota: String(m.nota || "")
        };
      }),
    categorias: {
      gasto: Array.isArray(cats.gasto) ? cats.gasto : base.categorias.gasto,
      ingreso: Array.isArray(cats.ingreso) ? cats.ingreso : base.categorias.ingreso
    },
    presupuestos:
      obj.presupuestos && typeof obj.presupuestos === "object" ? obj.presupuestos : {},
    cuentas: Array.isArray(obj.cuentas) ? obj.cuentas : [],
    metas: Array.isArray(obj.metas) ? obj.metas : [],
    recurrentes: Array.isArray(obj.recurrentes) ? obj.recurrentes : [],
    ultimoRespaldo: obj.ultimoRespaldo || null
  };
}

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) {
      const d = normalizar(JSON.parse(guardado));
      if (d) return d;
    }

    // Migración desde la versión anterior (solo guardaba la lista de movimientos)
    const viejo = localStorage.getItem("movimientos");
    if (viejo) {
      const d = normalizar({ movimientos: JSON.parse(viejo) });
      if (d) {
        d.movimientos.forEach(function (m) {
          if (d.categorias[m.tipo].indexOf(m.categoria) === -1) {
            d.categorias[m.tipo].push(m.categoria);
          }
        });
        return d;
      }
    }
  } catch (e) {
    // Si algo falla, se empieza con datos vacíos
  }

  // Protección: si había algo guardado que no se pudo leer, se conserva una copia
  // antes de empezar vacío, para que nunca se sobrescriba sin respaldo.
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo && !localStorage.getItem(CLAVE + "-copia-error")) {
      localStorage.setItem(CLAVE + "-copia-error", crudo);
    }
  } catch (e) {
    // Sin acceso al almacenamiento
  }
  return datosVacios();
}

let datos = cargar();

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (e) {
    alert("No se pudo guardar. Revisa el espacio de almacenamiento del teléfono.");
  }
}

// ---------- Utilidades ----------
function hoy() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function dinero(valor) {
  return "$" + valor.toLocaleString("es-CO");
}

function nombreMes(mes) {
  const partes = mes.split("-");
  const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function enPeriodo(m, mes) {
  return todoHistorial.checked || m.fecha.startsWith(mes);
}

function tipoSeleccionado(nombre) {
  return document.querySelector('input[name="' + nombre + '"]:checked').value;
}

function formatearMonto(input) {
  const digitos = input.value.replace(/\D/g, "");
  input.value = digitos ? Number(digitos).toLocaleString("es-CO") : "";
}

function llenarCategorias(select, tipo, actual) {
  const previo = actual !== undefined ? actual : select.value;
  const nombres = datos.categorias[tipo].slice();
  if (actual && nombres.indexOf(actual) === -1) nombres.push(actual);

  select.innerHTML = "";
  nombres.forEach(function (n) {
    const op = document.createElement("option");
    op.value = n;
    op.textContent = n;
    select.appendChild(op);
  });
  if (previo && nombres.indexOf(previo) !== -1) select.value = previo;
}

function llenarFiltro() {
  const previo = filtroCategoria.value;
  const todas = [];
  datos.categorias.gasto
    .concat(
      datos.categorias.ingreso,
      datos.movimientos.map(function (m) {
        return m.categoria;
      })
    )
    .forEach(function (c) {
      if (todas.indexOf(c) === -1) todas.push(c);
    });

  filtroCategoria.innerHTML = '<option value="">Todas</option>';
  todas.forEach(function (c) {
    const op = document.createElement("option");
    op.value = c;
    op.textContent = c;
    filtroCategoria.appendChild(op);
  });
  filtroCategoria.value = todas.indexOf(previo) !== -1 ? previo : "";
}

// ---------- Aviso con deshacer ----------
let temporizadorToast = null;

function ocultarToast() {
  toast.hidden = true;
}

function mostrarToast(texto, accion, alHacerClic) {
  toastTexto.textContent = texto;
  toastAccion.textContent = accion || "";
  toastAccion.hidden = !accion;
  toastAccion.onclick = function () {
    ocultarToast();
    if (alHacerClic) alHacerClic();
  };
  toast.hidden = false;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(ocultarToast, 6000);
}

// ---------- Registro ----------
function mostrar() {
  lista.innerHTML = "";
  datos.movimientos.sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha) || b.id - a.id;
  });

  if (datos.movimientos.length === 0) {
    lista.innerHTML = '<li class="vacio">Aún no hay movimientos</li>';
  }

  let ingresos = 0;
  let gastos = 0;

  datos.movimientos.forEach(function (m) {
    if (m.tipo === "ingreso") ingresos += m.monto;
    else gastos += m.monto;

    const li = document.createElement("li");
    li.className = m.tipo;

    const info = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent = m.categoria;
    const detalle = document.createElement("small");
    detalle.textContent = m.fecha + (m.nota ? " · " + m.nota : "");
    info.append(titulo, detalle);

    const monto = document.createElement("span");
    monto.className = "monto";
    monto.textContent = (m.tipo === "gasto" ? "-" : "+") + dinero(m.monto);

    li.append(info, monto);
    li.addEventListener("click", function () {
      abrirEdicion(m.id);
    });
    lista.appendChild(li);
  });

  const balance = ingresos - gastos;
  textoBalance.textContent = (balance < 0 ? "-" : "") + dinero(Math.abs(balance));
  textoIngresos.textContent = dinero(ingresos);
  textoGastos.textContent = dinero(gastos);

  actualizarAviso();
  llenarFiltro();
  mostrarGraficos();
}

// ---------- Editar y eliminar ----------
let idEditando = null;

function abrirEdicion(id) {
  const m = datos.movimientos.find(function (x) {
    return x.id === id;
  });
  if (!m) return;

  idEditando = id;
  document.querySelector('input[name="tipo-edit"][value="' + m.tipo + '"]').checked = true;
  editMonto.value = m.monto.toLocaleString("es-CO");
  llenarCategorias(editCategoria, m.tipo, m.categoria);
  editCategoria.value = m.categoria;
  editFecha.value = m.fecha;
  editNota.value = m.nota || "";
  hoja.hidden = false;
}

function cerrarEdicion() {
  hoja.hidden = true;
  idEditando = null;
}

formEditar.addEventListener("submit", function (e) {
  e.preventDefault();

  const m = datos.movimientos.find(function (x) {
    return x.id === idEditando;
  });
  const monto = Number(editMonto.value.replace(/\D/g, ""));
  if (!m || !monto) return;

  m.tipo = tipoSeleccionado("tipo-edit");
  m.monto = monto;
  m.categoria = editCategoria.value || "Otro";
  m.fecha = editFecha.value;
  m.nota = editNota.value;

  guardar();
  cerrarEdicion();
  mostrar();
});

document.getElementById("edit-eliminar").addEventListener("click", function () {
  const indice = datos.movimientos.findIndex(function (x) {
    return x.id === idEditando;
  });
  if (indice === -1) return;

  const eliminado = datos.movimientos.splice(indice, 1)[0];
  guardar();
  cerrarEdicion();
  mostrar();

  mostrarToast("Movimiento eliminado", "Deshacer", function () {
    datos.movimientos.push(eliminado);
    guardar();
    mostrar();
  });
});

document.getElementById("edit-cancelar").addEventListener("click", cerrarEdicion);
document.getElementById("hoja-fondo").addEventListener("click", cerrarEdicion);

document.querySelectorAll('input[name="tipo-edit"]').forEach(function (r) {
  r.addEventListener("change", function () {
    llenarCategorias(editCategoria, tipoSeleccionado("tipo-edit"));
  });
});

// ---------- Gráficos ----------
function mostrarResumen(mes) {
  const cont = document.getElementById("resumen");
  cont.innerHTML = "";

  const categoria = filtroCategoria.value;
  const coincidentes = datos.movimientos.filter(function (m) {
    return enPeriodo(m, mes) && (!categoria || m.categoria === categoria);
  });

  let gastado = 0;
  let ingresado = 0;
  coincidentes.forEach(function (m) {
    if (m.tipo === "gasto") gastado += m.monto;
    else ingresado += m.monto;
  });

  const titulo = document.createElement("h2");
  titulo.textContent =
    (categoria || "Todas las categorías") +
    " · " +
    (todoHistorial.checked ? "todo el historial" : nombreMes(mes));
  cont.appendChild(titulo);

  if (coincidentes.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "vacio";
    vacio.textContent = "Sin movimientos con este filtro.";
    cont.appendChild(vacio);
    return;
  }

  function fila(etiqueta, valor, clase) {
    const div = document.createElement("div");
    div.className = "fila-resumen";
    const a = document.createElement("span");
    a.textContent = etiqueta;
    const b = document.createElement("span");
    b.textContent = valor;
    if (clase) b.className = clase;
    div.append(a, b);
    cont.appendChild(div);
  }

  fila("Gastado", dinero(gastado), "gasto-valor");
  fila("Ingresos", dinero(ingresado), "ingreso-valor");
  fila("Movimientos", String(coincidentes.length), "");
}

function agrupar(tipo, mes) {
  const porCategoria = {};
  datos.movimientos.forEach(function (m) {
    if (m.tipo === tipo && enPeriodo(m, mes)) {
      porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + m.monto;
    }
  });
  const filas = Object.entries(porCategoria).sort(function (a, b) {
    return b[1] - a[1];
  });
  const total = filas.reduce(function (suma, f) {
    return suma + f[1];
  }, 0);
  return { filas: filas, total: total };
}

function crearChip(etiqueta, valor, clase) {
  const chip = document.createElement("div");
  chip.className = "chip " + clase;
  const a = document.createElement("span");
  a.textContent = etiqueta;
  const b = document.createElement("strong");
  b.textContent = dinero(valor);
  chip.append(a, b);
  return chip;
}

function agregarGrupo(cont, titulo, grupo, colores, claseValor, seleccionada, hayResaltado) {
  if (grupo.filas.length === 0) return;

  const cabecera = document.createElement("div");
  cabecera.className = "grupo-cabecera";
  const t = document.createElement("span");
  t.textContent = titulo;
  const v = document.createElement("span");
  v.className = claseValor;
  v.textContent = dinero(grupo.total);
  cabecera.append(t, v);
  cont.appendChild(cabecera);

  grupo.filas.forEach(function (fila, i) {
    const pct = Math.round((fila[1] / grupo.total) * 100);

    const div = document.createElement("div");
    div.className = "fila-leyenda";
    if (hayResaltado && fila[0] !== seleccionada) div.classList.add("atenuada");

    const punto = document.createElement("span");
    punto.className = "punto";
    punto.style.background = colores[i % colores.length];

    const nombre = document.createElement("span");
    nombre.className = "nombre";
    nombre.textContent = fila[0];

    const valor = document.createElement("span");
    valor.className = "leyenda-valor";
    valor.textContent = dinero(fila[1]);

    const porcentaje = document.createElement("span");
    porcentaje.className = "leyenda-pct";
    porcentaje.textContent = pct + "%";

    div.append(punto, nombre, valor, porcentaje);
    cont.appendChild(div);
  });
}

function dibujarRueda(mes) {
  const cont = document.getElementById("grafico");
  cont.innerHTML = "";

  const ing = agrupar("ingreso", mes);
  const gas = agrupar("gasto", mes);
  const granTotal = ing.total + gas.total;
  const balance = ing.total - gas.total;

  const segmentos = [];
  ing.filas.forEach(function (f, i) {
    segmentos.push({
      nombre: f[0],
      valor: f[1],
      color: COLORES_INGRESO[i % COLORES_INGRESO.length]
    });
  });
  gas.filas.forEach(function (f, i) {
    segmentos.push({
      nombre: f[0],
      valor: f[1],
      color: COLORES_GASTO[i % COLORES_GASTO.length]
    });
  });

  const seleccionada = filtroCategoria.value;
  const hayResaltado = segmentos.some(function (s) {
    return s.nombre === seleccionada;
  });

  let anillo = "";
  let centro;

  if (granTotal === 0) {
    anillo =
      '<circle class="pista" cx="21" cy="21" r="15.9155" fill="none" stroke-width="4"></circle>';
    centro = '<text class="donut-etiqueta" x="21" y="22.4" font-size="2.8">Sin datos</text>';
  } else {
    let acumulado = 0;
    const hueco = segmentos.length > 1 ? 0.8 : 0;

    segmentos.forEach(function (s) {
      const pct = (s.valor / granTotal) * 100;
      const trazo = Math.max(pct - hueco, 0.1);
      const opacidad = !hayResaltado || s.nombre === seleccionada ? 1 : 0.2;
      anillo +=
        '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="' + s.color +
        '" stroke-opacity="' + opacidad +
        '" stroke-width="4" stroke-dasharray="' + trazo + " " + (100 - trazo) +
        '" stroke-dashoffset="' + (125 - acumulado) + '"></circle>';
      acumulado += pct;
    });

    const texto = (balance < 0 ? "-" : "") + dinero(Math.abs(balance));
    const tam = texto.length > 11 ? 3 : texto.length > 9 ? 3.5 : 4;
    centro =
      '<text class="donut-etiqueta" x="21" y="18.8" font-size="2.3">Balance</text>' +
      '<text class="donut-total" x="21" y="24.3" font-size="' + tam + '">' +
      texto + "</text>";
  }

  cont.innerHTML = '<svg class="donut" viewBox="0 0 42 42">' + anillo + centro + "</svg>";

  if (granTotal === 0) return;

  const chips = document.createElement("div");
  chips.className = "chips";
  chips.append(
    crearChip("Ingresos", ing.total, "chip-ingreso"),
    crearChip("Gastos", gas.total, "chip-gasto")
  );
  cont.appendChild(chips);

  agregarGrupo(cont, "Ingresos", ing, COLORES_INGRESO, "ingreso-valor", seleccionada, hayResaltado);
  agregarGrupo(cont, "Gastos", gas, COLORES_GASTO, "gasto-valor", seleccionada, hayResaltado);
}

function mostrarGraficos() {
  const mes = inputMes.value || hoy().slice(0, 7);
  inputMes.disabled = todoHistorial.checked;
  mostrarResumen(mes);
  dibujarRueda(mes);
}

// ---------- Categorías propias (Ajustes) ----------
function dibujarCategorias() {
  ["gasto", "ingreso"].forEach(function (tipo) {
    const cont = document.getElementById("cats-" + tipo);
    cont.innerHTML = "";

    if (datos.categorias[tipo].length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "ayuda";
      vacio.textContent = "No tienes categorías. Añade una abajo.";
      cont.appendChild(vacio);
      return;
    }

    datos.categorias[tipo].forEach(function (nombre) {
      const fila = document.createElement("div");
      fila.className = "fila-cat";

      const etiqueta = document.createElement("span");
      etiqueta.textContent = nombre;

      const renombrar = document.createElement("button");
      renombrar.type = "button";
      renombrar.className = "btn-texto";
      renombrar.textContent = "Renombrar";
      renombrar.addEventListener("click", function () {
        renombrarCategoria(tipo, nombre);
      });

      const borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "btn-texto";
      borrar.textContent = "Borrar";
      borrar.addEventListener("click", function () {
        borrarCategoria(tipo, nombre);
      });

      fila.append(etiqueta, renombrar, borrar);
      cont.appendChild(fila);
    });
  });
}

function refrescarTodo() {
  dibujarCategorias();
  llenarCategorias(selectCategoria, tipoSeleccionado("tipo"));
  mostrar();
}

function agregarCategoria(tipo) {
  const input = document.getElementById("nueva-" + tipo);
  const nombre = input.value.trim();
  if (!nombre) return;

  const existe = datos.categorias[tipo].some(function (c) {
    return c.toLowerCase() === nombre.toLowerCase();
  });
  if (existe) {
    alert("Esa categoría ya existe.");
    return;
  }

  datos.categorias[tipo].push(nombre);
  input.value = "";
  guardar();
  refrescarTodo();
}

function renombrarCategoria(tipo, viejo) {
  const nuevo = (prompt("Nuevo nombre para «" + viejo + "»:", viejo) || "").trim();
  if (!nuevo || nuevo === viejo) return;

  if (datos.categorias[tipo].indexOf(nuevo) !== -1) {
    alert("Ya existe una categoría con ese nombre.");
    return;
  }

  const i = datos.categorias[tipo].indexOf(viejo);
  datos.categorias[tipo][i] = nuevo;

  datos.movimientos.forEach(function (m) {
    if (m.tipo === tipo && m.categoria === viejo) m.categoria = nuevo;
  });

  if (tipo === "gasto" && datos.presupuestos[viejo] !== undefined) {
    datos.presupuestos[nuevo] = datos.presupuestos[viejo];
    delete datos.presupuestos[viejo];
  }

  guardar();
  refrescarTodo();
}

function borrarCategoria(tipo, nombre) {
  const usos = datos.movimientos.filter(function (m) {
    return m.tipo === tipo && m.categoria === nombre;
  }).length;

  const aviso =
    usos > 0
      ? "«" + nombre + "» tiene " + usos +
        " movimiento(s). Se conservarán, pero ya no podrás elegir esta categoría. ¿Borrarla?"
      : "¿Borrar la categoría «" + nombre + "»?";
  if (!confirm(aviso)) return;

  datos.categorias[tipo] = datos.categorias[tipo].filter(function (c) {
    return c !== nombre;
  });
  guardar();
  refrescarTodo();
}

document.querySelectorAll("[data-agregar]").forEach(function (boton) {
  boton.addEventListener("click", function () {
    agregarCategoria(boton.dataset.agregar);
  });
});

["gasto", "ingreso"].forEach(function (tipo) {
  document.getElementById("nueva-" + tipo).addEventListener("keydown", function (e) {
    if (e.key === "Enter") agregarCategoria(tipo);
  });
});

// ---------- Respaldo ----------
function actualizarAviso() {
  let mostrarAviso = false;
  if (datos.movimientos.length > 0) {
    if (!datos.ultimoRespaldo) {
      mostrarAviso = true;
    } else {
      const dias = (Date.now() - new Date(datos.ultimoRespaldo).getTime()) / 86400000;
      mostrarAviso = dias > 30;
    }
  }
  avisoRespaldo.hidden = !mostrarAviso;
}

function actualizarInfoRespaldo() {
  const info = document.getElementById("info-respaldo");
  if (datos.ultimoRespaldo) {
    const fecha = new Date(datos.ultimoRespaldo).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    info.textContent = "Último respaldo: " + fecha;
  } else {
    info.textContent = "Aún no has hecho ningún respaldo.";
  }
  actualizarAviso();
}

function marcarRespaldo() {
  datos.ultimoRespaldo = new Date().toISOString();
  guardar();
  actualizarInfoRespaldo();
  mostrarToast("Respaldo listo", "", null);
}

async function exportar() {
  const contenido = JSON.stringify(datos, null, 2);
  const nombre = "respaldo-finanzas-" + hoy() + ".json";

  // En el iPhone se abre el menú de compartir (ahí eliges "Guardar en Archivos")
  try {
    const archivo = new File([contenido], nombre, { type: "text/plain" });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: "Respaldo Mis Finanzas" });
      marcarRespaldo();
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }

  // En el computador se descarga directamente
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
  marcarRespaldo();
}

document.getElementById("btn-exportar").addEventListener("click", exportar);

document.getElementById("btn-importar").addEventListener("click", function () {
  archivoImportar.click();
});

archivoImportar.addEventListener("change", async function () {
  const archivo = archivoImportar.files[0];
  if (!archivo) return;

  try {
    const texto = await archivo.text();
    const nuevos = normalizar(JSON.parse(texto));
    if (!nuevos) throw new Error("formato");

    const ok = confirm(
      "Vas a reemplazar tus datos actuales (" + datos.movimientos.length +
      " movimientos) por los del respaldo (" + nuevos.movimientos.length +
      " movimientos). ¿Continuar?"
    );
    if (!ok) return;

    // Copia de seguridad de lo que había antes de reemplazar
    try {
      localStorage.setItem(CLAVE + "-antes-de-importar", JSON.stringify(datos));
    } catch (e) {
      // Sin espacio: se continúa igual
    }

    datos = nuevos;
    guardar();
    refrescarTodo();
    actualizarInfoRespaldo();
    mostrarToast("Respaldo restaurado", "", null);
  } catch (e) {
    alert("Ese archivo no es un respaldo válido de Mis Finanzas.");
  } finally {
    archivoImportar.value = "";
  }
});

// ---------- Pestañas ----------
const VISTAS = ["registro", "graficos", "ajustes"];

function cambiarVista(nombre) {
  VISTAS.forEach(function (v) {
    document.getElementById("vista-" + v).hidden = v !== nombre;
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.classList.toggle("activa", t.dataset.vista === nombre);
  });

  if (nombre === "graficos") mostrarGraficos();
  if (nombre === "ajustes") {
    dibujarCategorias();
    actualizarInfoRespaldo();
  }
  window.scrollTo(0, 0);
}

document.querySelectorAll(".tab").forEach(function (t) {
  t.addEventListener("click", function () {
    cambiarVista(t.dataset.vista);
  });
});

avisoRespaldo.addEventListener("click", function () {
  cambiarVista("ajustes");
});

// ---------- Nuevo movimiento ----------
formulario.addEventListener("submit", function (e) {
  e.preventDefault();

  const monto = Number(inputMonto.value.replace(/\D/g, ""));
  if (!monto) {
    inputMonto.focus();
    return;
  }

  datos.movimientos.push({
    id: Date.now(),
    tipo: tipoSeleccionado("tipo"),
    monto: monto,
    categoria: selectCategoria.value || "Otro",
    fecha: inputFecha.value || hoy(),
    nota: inputNota.value.trim()
  });

  guardar();
  mostrar();

  inputMonto.value = "";
  inputNota.value = "";
  mostrarToast("Movimiento guardado", "", null);
});

document.querySelectorAll('input[name="tipo"]').forEach(function (r) {
  r.addEventListener("change", function () {
    llenarCategorias(selectCategoria, tipoSeleccionado("tipo"));
  });
});

inputMonto.addEventListener("input", function () {
  formatearMonto(inputMonto);
});
editMonto.addEventListener("input", function () {
  formatearMonto(editMonto);
});

// ---------- Filtros de gráficos ----------
inputMes.addEventListener("change", mostrarGraficos);
filtroCategoria.addEventListener("change", mostrarGraficos);
todoHistorial.addEventListener("change", mostrarGraficos);

// ---------- Inicio ----------
inputFecha.value = hoy();
inputMes.value = hoy().slice(0, 7);
llenarCategorias(selectCategoria, "gasto");
dibujarCategorias();
actualizarInfoRespaldo();
mostrar();
