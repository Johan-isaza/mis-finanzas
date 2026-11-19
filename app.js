// ---------- Elementos de la página ----------
const lista = document.getElementById("lista");
const primerUso = document.getElementById("primer-uso");
const ayudaLista = document.getElementById("ayuda-lista");
const btnNuevo = document.getElementById("btn-nuevo");
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
const anuncio = document.getElementById("anuncio");

const archivoImportar = document.getElementById("archivo-importar");

// Colores de la rueda: salen de los tokens --grafico-N de style.css (derivados de --rojo)
const COLORES_GASTO = [1, 2, 3, 4, 5, 6].map(function (n) {
  return "var(--grafico-" + n + ")";
});

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
    ahorro: ahorroVacio(),
    viajes: [],
    categoriasViaje: CATS_VIAJE.slice(),
    ultimoRespaldo: null,
    // Cuándo se registró el primer movimiento (para pedir el primer respaldo a tiempo)
    inicio: null
  };
}

const FRECUENCIAS = ["diario", "semanal", "mensual"];
const CATS_VIAJE = ["Comida", "Transporte", "Hospedaje", "Paseos", "Compras", "Otro"];
const MAX_DIAS_VIAJE = 60;
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Un viaje: la plata que se lleva (caja: + sale del disponible, − vuelve) y lo que se gasta
function normalizarViaje(v, i) {
  if (!v || typeof v !== "object" || typeof v.inicio !== "string" || !ES_FECHA.test(v.inicio)) return null;
  const dias = Math.round(Number(v.dias));
  return {
    id: v.id || Date.now() + i,
    nombre: String(v.nombre || "Mi viaje").slice(0, 40),
    dias: dias >= 1 ? Math.min(dias, MAX_DIAS_VIAJE) : 1,
    porDia: Number(v.porDia) > 0 ? Number(v.porDia) : 0,
    inicio: v.inicio,
    caja: (Array.isArray(v.caja) ? v.caja : [])
      .filter(function (c) {
        return c && typeof c.fecha === "string" && ES_FECHA.test(c.fecha) && Number(c.monto) && isFinite(Number(c.monto));
      })
      .map(function (c, j) {
        return { id: c.id || Date.now() + j, fecha: c.fecha, monto: Number(c.monto), nota: String(c.nota || "").slice(0, 40) };
      }),
    gastos: (Array.isArray(v.gastos) ? v.gastos : [])
      .filter(function (g) {
        return g && typeof g.fecha === "string" && ES_FECHA.test(g.fecha) && Number(g.monto) > 0;
      })
      .map(function (g, j) {
        return {
          id: g.id || Date.now() + j,
          fecha: g.fecha,
          monto: Number(g.monto),
          categoria: String(g.categoria || "Otro").slice(0, 30),
          nota: String(g.nota || "").slice(0, 80)
        };
      }),
    terminado: typeof v.terminado === "string" && ES_FECHA.test(v.terminado) ? v.terminado : null
  };
}
const TIPOS_LUGAR = ["Alcancía", "Cuenta de ahorros", "Tarjeta", "CDT", "Bolsillo digital", "Efectivo", "Otro"];
// Alto para poder rearmar la gráfica de ahorro mes a mes y lo pasado al ahorro
const MAX_HISTORIAL = 1000;

function ahorroVacio() {
  return {
    plan: { monto: 0, frecuencia: "semanal", meses: 12, incluir: true },
    lugares: [],
    // Ahorros aceptados: se confirma cada depósito y se ganan premios
    planes: []
  };
}

function normalizarPlan(p, i) {
  if (!p || typeof p !== "object" || !(Number(p.monto) > 0)) return null;
  if (typeof p.inicio !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.inicio)) return null;
  const depositos = {};
  if (p.depositos && typeof p.depositos === "object") {
    Object.keys(p.depositos).forEach(function (k) {
      if (/^\d+$/.test(k) && typeof p.depositos[k] === "string") depositos[k] = p.depositos[k];
    });
  }
  return {
    id: p.id || Date.now() + i,
    motivo: String(p.motivo || "Mi ahorro").slice(0, 40),
    monto: Number(p.monto),
    frecuencia: FRECUENCIAS.indexOf(p.frecuencia) !== -1 ? p.frecuencia : "semanal",
    meses: Number(p.meses) > 0 ? Number(p.meses) : 12,
    inicio: p.inicio,
    lugarId: p.lugarId || null,
    depositos: depositos,
    logros: Array.isArray(p.logros) ? p.logros.filter(function (x) { return typeof x === "string"; }) : []
  };
}

function normalizarAhorro(a) {
  const base = ahorroVacio();
  if (!a || typeof a !== "object") return base;
  const p = a.plan || {};
  return {
    plan: {
      monto: Number(p.monto) > 0 ? Number(p.monto) : 0,
      frecuencia: FRECUENCIAS.indexOf(p.frecuencia) !== -1 ? p.frecuencia : base.plan.frecuencia,
      meses: Number(p.meses) > 0 ? Number(p.meses) : base.plan.meses,
      incluir: p.incluir !== false
    },
    lugares: (Array.isArray(a.lugares) ? a.lugares : [])
      .filter(function (l) {
        return l && typeof l === "object";
      })
      .map(function (l, i) {
        return {
          id: l.id || Date.now() + i,
          tipo: TIPOS_LUGAR.indexOf(l.tipo) !== -1 ? l.tipo : "Otro",
          nombre: String(l.nombre || ""),
          saldo: Number(l.saldo) > 0 ? Number(l.saldo) : 0,
          tasa: Number(l.tasa) > 0 ? Number(l.tasa) : 0,
          vence: typeof l.vence === "string" ? l.vence : "",
          // Cambios de saldo (+ entra, − sale), el más reciente primero
          historial: (Array.isArray(l.historial) ? l.historial : [])
            .filter(function (h) {
              return h && typeof h.fecha === "string" && Number(h.monto) && isFinite(Number(h.monto));
            })
            .slice(0, MAX_HISTORIAL)
            .map(function (h) {
              const c = { fecha: h.fecha, monto: Number(h.monto), nota: String(h.nota || "").slice(0, 40) };
              if (h.fuera) c.fuera = true;
              return c;
            })
        };
      }),
    planes: (Array.isArray(a.planes) ? a.planes : []).map(normalizarPlan).filter(Boolean)
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
    ahorro: normalizarAhorro(obj.ahorro),
    viajes: (Array.isArray(obj.viajes) ? obj.viajes : []).map(normalizarViaje).filter(Boolean),
    categoriasViaje: Array.isArray(obj.categoriasViaje) && obj.categoriasViaje.length
      ? obj.categoriasViaje.filter(function (c) { return typeof c === "string" && c.trim(); }).map(function (c) { return c.trim().slice(0, 30); })
      : CATS_VIAJE.slice(),
    ultimoRespaldo: obj.ultimoRespaldo || null,
    inicio: obj.inicio || null
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

// Devuelve false si no se pudo escribir, para no decir "guardado" cuando no lo está
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch (e) {
    avisarSinGuardar();
    return false;
  }
}

// Sin cuadros del navegador: el error aparece dentro de la hoja abierta
// (lo escrito sigue ahí) o, si no hay hoja, en el aviso de abajo
function avisarSinGuardar() {
  const enHoja = document.querySelector(".hoja:not([hidden]) .hoja-error");
  const recuperar = "Libera espacio en el teléfono e inténtalo de nuevo.";
  if (enHoja) {
    enHoja.textContent = "No se pudo guardar. " + recuperar;
    enHoja.hidden = false;
  } else {
    mostrarToast("No se pudo guardar", "", null, recuperar);
  }
}

function limpiarErrorHoja(panel) {
  const caja = panel.querySelector(".hoja-error");
  caja.textContent = "";
  caja.hidden = true;
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

// Escribe un monto permitiendo que, si no cabe, solo se parta tras un punto de miles
function ponerMonto(el, texto) {
  el.textContent = "";
  texto.split(".").forEach(function (parte, i, partes) {
    el.append(parte + (i < partes.length - 1 ? "." : ""));
    if (i < partes.length - 1) el.appendChild(document.createElement("wbr"));
  });
}

function nombreMes(mes) {
  const partes = mes.split("-");
  const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function mayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Noviembre 2026" o "Todo el historial", según el periodo elegido en Gráficos
function nombrePeriodo(mes) {
  if (todoHistorial.checked) return "Todo el historial";
  return mayuscula(nombreMes(mes).replace(" de ", " "));
}

function enPeriodo(m, mes) {
  return todoHistorial.checked || m.fecha.startsWith(mes);
}

function tipoSeleccionado(nombre) {
  return document.querySelector('input[name="' + nombre + '"]:checked').value;
}

// Hasta 13 cifras (billones): más allá los números pierden exactitud
const MAX_CIFRAS = 13;

function formatearMonto(input) {
  // Si se pega "20.000,50" se descartan los centavos en vez de sumarlos como cifras
  const sinCentavos = input.value.replace(/,\d{1,2}$/, "");
  const digitos = sinCentavos.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_CIFRAS);
  input.value = digitos ? Number(digitos).toLocaleString("es-CO") : "";
  marcarError(input, "");
}

// Muestra (o quita) el error de un campo y lo enlaza para los lectores de pantalla
function marcarError(input, texto) {
  const caja = document.getElementById(input.id + "-error");
  if (!caja) return;
  caja.textContent = texto;
  caja.hidden = !texto;
  if (texto) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function leerMonto(input) {
  const monto = Number(input.value.replace(/\D/g, ""));
  if (!monto) {
    marcarError(input, "Escribe un monto mayor que 0.");
    input.focus();
    return 0;
  }
  return monto;
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
  document.body.classList.remove("con-toast");
}

// Lo lee VoiceOver sin mover el foco. Se vacía primero para que repita
// el mismo mensaje si se guarda dos veces seguidas.
function anunciar(texto) {
  anuncio.textContent = "";
  setTimeout(function () {
    anuncio.textContent = texto;
  }, 50);
}

function programarCierreToast() {
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(ocultarToast, 6000);
}

// detalle (opcional): segunda línea, p. ej. "Comida · -$20.000 · hoy"
function mostrarToast(texto, accion, alHacerClic, detalle) {
  toastTexto.textContent = "";
  const t = document.createElement("strong");
  t.textContent = texto;
  toastTexto.appendChild(t);
  if (detalle) {
    const d = document.createElement("span");
    d.className = "toast-detalle";
    d.textContent = detalle;
    toastTexto.appendChild(d);
  }
  toastAccion.textContent = accion || "";
  toastAccion.hidden = !accion;
  toastAccion.onclick = function () {
    ocultarToast();
    if (alHacerClic) alHacerClic();
  };
  toast.hidden = false;
  // El botón flotante sube para no quedar tapado por el aviso
  document.documentElement.style.setProperty("--toast-alto", toast.offsetHeight + "px");
  document.body.classList.add("con-toast");
  const leido = texto + (detalle ? ": " + detalle : "");
  anunciar(accion ? leido + ". Puedes " + accion.toLowerCase() + "." : leido);
  programarCierreToast();
}

// Mientras el foco está en el aviso (teclado o VoiceOver) no se cierra solo
toast.addEventListener("focusin", function () {
  clearTimeout(temporizadorToast);
});
toast.addEventListener("focusout", programarCierreToast);

// "hoy", "ayer" o "12 nov": cómo se nombra la fecha en el aviso de guardado
function fechaCorta(fecha) {
  if (fecha === hoy()) return "hoy";
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  ayer.setMinutes(ayer.getMinutes() - ayer.getTimezoneOffset());
  if (fecha === ayer.toISOString().slice(0, 10)) return "ayer";
  const p = fecha.split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
    .toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    .replace(".", "");
}

// ---------- Registro ----------
// idResaltado: el movimiento recién guardado se marca un momento en la lista
function mostrar(idResaltado) {
  lista.innerHTML = "";
  datos.movimientos.sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha) || b.id - a.id;
  });

  const vacia = datos.movimientos.length === 0;
  lista.hidden = vacia;
  ayudaLista.hidden = vacia;
  primerUso.hidden = !vacia;

  // El balance de Registro cubre solo el mes en curso (la lista muestra todo)
  const mesActual = hoy().slice(0, 7);
  let ingresos = 0;
  let gastos = 0;

  datos.movimientos.forEach(function (m) {
    if (m.fecha.startsWith(mesActual)) {
      if (m.tipo === "ingreso") ingresos += m.monto;
      else gastos += m.monto;
    }

    const li = document.createElement("li");
    li.className = m.tipo;
    if (m.id === idResaltado) li.classList.add("recien");

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "mov";
    boton.dataset.id = m.id;

    // Círculo con la inicial de la categoría
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (m.categoria.trim().charAt(0) || "?").toUpperCase();

    const info = document.createElement("div");
    const titulo = document.createElement("strong");
    titulo.textContent = m.categoria;
    const detalle = document.createElement("small");
    detalle.textContent = mayuscula(fechaCorta(m.fecha)) + (m.nota ? " · " + m.nota : "");
    info.append(titulo, detalle);

    const monto = document.createElement("span");
    monto.className = "monto";
    monto.textContent = (m.tipo === "gasto" ? "−" : "+") + dinero(m.monto);

    // Lo que lee VoiceOver: "Comida, gasto de $20.000, 2026-11-19. Editar"
    boton.setAttribute(
      "aria-label",
      m.categoria + ", " + m.tipo + " de " + dinero(m.monto) + ", " + fechaCorta(m.fecha) +
        (m.nota ? ", " + m.nota : "") + ". Editar"
    );
    boton.append(avatar, info, monto);
    boton.addEventListener("click", function () {
      abrirEdicion(m.id);
    });
    li.appendChild(boton);
    lista.appendChild(li);
  });

  ponerMonto(textoIngresos, dinero(ingresos));
  ponerMonto(textoGastos, dinero(gastos));
  dibujarLiquidez();

  actualizarAviso();
  llenarFiltro();
  mostrarGraficos();
}

// ---------- Liquidez: lo que pasa al ahorro sale de la plata disponible ----------
function sumaMovimientos(tipo, prefijo) {
  return datos.movimientos.reduce(function (s, m) {
    return m.tipo === tipo && m.fecha.startsWith(prefijo) ? s + m.monto : s;
  }, 0);
}

// Un saldo inicial o un ajuste solo anota plata que ya estaba ahorrada:
// no sale de la liquidez. Lo que se añade, se saca o se deposita en una meta, sí.
function esTraspaso(h) {
  return !h.fuera && h.nota !== "Saldo inicial" && h.nota !== "Ajuste del saldo";
}

// Neto pasado al ahorro en el periodo (+ entró al ahorro, − se sacó del ahorro)
// prefijo: "2026-11" para un mes, "" para todo el historial
function alAhorro(prefijo) {
  let total = 0;
  datos.ahorro.lugares.forEach(function (l) {
    l.historial.forEach(function (h) {
      if (esTraspaso(h) && h.fecha.startsWith(prefijo)) total += h.monto;
    });
  });
  return total;
}

function conSigno(v) {
  return (v < 0 ? "-" : "") + dinero(Math.abs(v));
}

// Toda la plata que no está ahorrada ni en un viaje
function disponibleTotal() {
  return sumaMovimientos("ingreso", "") - sumaMovimientos("gasto", "") - alAhorro("") - aViajes("");
}

function dibujarLiquidez() {
  const mesActual = hoy().slice(0, 7);
  const ahorroMes = alAhorro(mesActual);
  const viajeMes = aViajes(mesActual);
  const disponibleMes = sumaMovimientos("ingreso", mesActual) - sumaMovimientos("gasto", mesActual) - ahorroMes - viajeMes;

  const nombreMesActual = mayuscula(new Date().toLocaleDateString("es-CO", { month: "long" }));
  document.getElementById("balance-etiqueta").textContent =
    nombreMesActual + (ahorroMes || viajeMes ? " · Disponible" : " · Balance");
  const textoSaldo = conSigno(disponibleMes);
  ponerMonto(textoBalance, textoSaldo);
  textoBalance.classList.toggle("hero-valor-largo", textoSaldo.length > 12);

  const linea = document.getElementById("hero-ahorro");
  linea.hidden = !ahorroMes;
  linea.textContent = ahorroMes > 0
    ? "Ya descontado: pasaste " + dinero(ahorroMes) + " al ahorro este mes"
    : "Incluye " + dinero(-ahorroMes) + " que sacaste del ahorro este mes";

  const lineaViaje = document.getElementById("hero-viaje");
  lineaViaje.hidden = !viajeMes;
  lineaViaje.textContent = viajeMes > 0
    ? "Ya descontado: " + dinero(viajeMes) + " se fueron a viajes este mes"
    : "Incluye " + dinero(-viajeMes) + " que te sobraron de un viaje";

  // Todo lo que tengo
  const ahorrado = totalAhorrado();
  const enViaje = plataEnViajes();
  const disponible = disponibleTotal();
  const total = disponible + ahorrado + enViaje;
  const tarjeta = document.getElementById("patrimonio");
  tarjeta.hidden = datos.movimientos.length === 0 && datos.ahorro.lugares.length === 0 && datos.viajes.length === 0;
  ponerMonto(document.getElementById("patrimonio-total"), conSigno(total));
  ponerMonto(document.getElementById("patrimonio-disponible"), conSigno(disponible));
  ponerMonto(document.getElementById("patrimonio-ahorrado"), dinero(ahorrado));
  document.getElementById("patrimonio-ir-viaje").hidden = enViaje <= 0;
  ponerMonto(document.getElementById("patrimonio-viaje"), dinero(enViaje));
  const positivo = Math.max(disponible, 0) + ahorrado + enViaje;
  const barra = document.getElementById("patrimonio-barra");
  barra.hidden = positivo <= 0;
  if (positivo > 0) {
    barra.children[0].style.flexGrow = Math.max(disponible, 0) / positivo;
    barra.children[1].style.flexGrow = ahorrado / positivo;
    barra.children[2].style.flexGrow = enViaje / positivo;
  }
}

document.getElementById("patrimonio-ir-viaje").addEventListener("click", function () {
  cambiarVista("viajes");
});

document.getElementById("patrimonio-ir-ahorro").addEventListener("click", function () {
  cambiarVista("ahorro");
});

// ---------- Gráfica del ahorro mes a mes ----------
// "$1,2 M", "$350 mil": cabe encima de una columna angosta
function dineroCorto(v) {
  if (v >= 1e6) return "$" + (Math.round(v / 1e5) / 10).toLocaleString("es-CO") + " M";
  if (v >= 1e4) return "$" + Math.round(v / 1e3).toLocaleString("es-CO") + " mil";
  return dinero(v);
}

// Total ahorrado al cierre de cada uno de los últimos meses (hasta 6),
// rearmado hacia atrás desde el saldo de hoy con los cambios anotados
function serieAhorro() {
  const cambios = [];
  datos.ahorro.lugares.forEach(function (l) {
    l.historial.forEach(function (h) {
      cambios.push(h);
    });
  });
  const mesActual = hoy().slice(0, 7);
  const primero = cambios.reduce(function (min, h) {
    const m = h.fecha.slice(0, 7);
    return m < min ? m : min;
  }, mesActual);

  const meses = [];
  const d = leerFecha(mesActual + "-01");
  for (let i = 0; i < 6; i++) {
    const m = isoDe(d).slice(0, 7);
    if (m < primero) break;
    meses.unshift(m);
    d.setMonth(d.getMonth() - 1);
  }

  const hoyTotal = totalAhorrado();
  return meses.map(function (m) {
    const despues = cambios.reduce(function (s, h) {
      return h.fecha.slice(0, 7) > m ? s + h.monto : s;
    }, 0);
    return { mes: m, total: Math.max(0, hoyTotal - despues) };
  });
}

function dibujarGraficoAhorro(idCont, idTarjeta) {
  const cont = document.getElementById(idCont);
  const tarjeta = document.getElementById(idTarjeta);
  cont.innerHTML = "";
  const hay = datos.ahorro.lugares.length > 0;
  tarjeta.hidden = !hay;
  if (!hay) return;

  const serie = serieAhorro();
  const ultimo = serie[serie.length - 1];
  const previo = serie.length > 1 ? serie[serie.length - 2].total : null;
  const maximo = Math.max.apply(null, serie.map(function (p) { return p.total; })) || 1;

  const cab = el("div", "ahorro-cab");
  const grande = el("p", "ahorro-cab-valor");
  ponerMonto(grande, dinero(ultimo.total));
  cab.appendChild(grande);
  if (previo !== null) {
    const dif = ultimo.total - previo;
    const txt = dif === 0 ? "Igual que el mes pasado" : (dif > 0 ? "+" : "−") + dinero(Math.abs(dif)) + " este mes";
    cab.appendChild(el("span", "ahorro-cab-cambio " + (dif > 0 ? "sube" : dif < 0 ? "baja" : ""), txt));
  } else {
    cab.appendChild(el("span", "ahorro-cab-cambio", "Ahorrado hasta hoy"));
  }
  cont.appendChild(cab);

  const cols = el("div", "cols-ahorro");
  cols.setAttribute("role", "img");
  cols.setAttribute("aria-label", "Total ahorrado por mes: " + serie.map(function (p) {
    return nombreMes(p.mes) + " " + dinero(p.total);
  }).join(", "));
  serie.forEach(function (p, i) {
    const col = el("div", "col-ahorro" + (i === serie.length - 1 ? " actual" : ""));
    col.setAttribute("aria-hidden", "true");
    col.appendChild(el("span", "col-valor", p.total ? dineroCorto(p.total) : "$0"));
    const pista = el("div", "col-pista");
    const barra = el("div", "col-barra");
    barra.style.height = Math.max((p.total / maximo) * 100, p.total ? 4 : 0) + "%";
    pista.appendChild(barra);
    col.appendChild(pista);
    const fecha = leerFecha(p.mes + "-01");
    col.appendChild(el("span", "col-mes", fecha.toLocaleDateString("es-CO", { month: "short" }).replace(".", "")));
    cols.appendChild(col);
  });
  cont.appendChild(cols);
}

// ---------- Registrar, editar y eliminar (una sola hoja) ----------
// idEditando === null con la hoja abierta significa "movimiento nuevo"
let idEditando = null;
let focoAntesDeEditar = null;

// Lo último elegido al registrar se repite la próxima vez (lo habitual es anotar
// varios gastos seguidos de la misma clase)
const ultimoUsado = { tipo: "gasto", categoria: { gasto: "", ingreso: "" } };

// Lo que queda detrás de la hoja se vuelve inaccesible mientras está abierta
// (incluido el aviso con Deshacer, para que el teclado no salga de la hoja)
const FONDO_HOJA = [document.querySelector("main"), document.querySelector(".tabs"), toast];
const ventanaMetas = document.getElementById("ventana-metas");
const ventanaViaje = document.getElementById("ventana-viaje");
const VENTANAS = [ventanaMetas, ventanaViaje];

function modoHoja(nuevo) {
  document.getElementById("titulo-editar").textContent = nuevo ? "Nuevo movimiento" : "Editar movimiento";
  document.getElementById("edit-guardar").textContent = nuevo ? "Guardar" : "Guardar cambios";
  document.getElementById("edit-eliminar").hidden = nuevo;
  document.getElementById("edit-acciones").classList.toggle("una-accion", nuevo);
}

function abrirNuevo() {
  idEditando = null;
  modoHoja(true);
  const tipo = ultimoUsado.tipo;
  document.querySelector('input[name="tipo-edit"][value="' + tipo + '"]').checked = true;
  llenarCategorias(editCategoria, tipo, "");
  if (ultimoUsado.categoria[tipo]) editCategoria.value = ultimoUsado.categoria[tipo];
  if (!editCategoria.value && editCategoria.options.length) editCategoria.selectedIndex = 0;
  editMonto.value = "";
  editFecha.value = hoy();
  editNota.value = "";
  marcarError(editMonto, "");
  limpiarErrorHoja(formEditar);

  focoAntesDeEditar = document.activeElement;
  hoja.hidden = false;
  fondoInerte(true);
  // Aquí sí se enfoca el monto: abrir la hoja ya es la intención de escribir uno,
  // y al hacerlo dentro del toque el iPhone abre el teclado numérico
  editMonto.focus();
}

btnNuevo.addEventListener("click", abrirNuevo);
document.getElementById("btn-primer").addEventListener("click", abrirNuevo);

// Con la ventana de metas abierta, lo de atrás (pantalla y pestañas) sigue bloqueado
// aunque se cierre una hoja; el aviso con deshacer sí vuelve a quedar disponible
function fondoInerte(activo) {
  // Al abrir una hoja, el aviso de abajo se quita para no tapar sus botones
  if (activo) ocultarToast();
  const abierta = VENTANAS.find(function (v) { return !v.hidden; });
  FONDO_HOJA.concat(VENTANAS).forEach(function (el) {
    const bloquear = activo || (abierta && el !== abierta && el !== toast);
    el.inert = bloquear;
    if (bloquear) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  });
}

function abrirEdicion(id) {
  const m = datos.movimientos.find(function (x) {
    return x.id === id;
  });
  if (!m) return;

  idEditando = id;
  modoHoja(false);
  document.querySelector('input[name="tipo-edit"][value="' + m.tipo + '"]').checked = true;
  editMonto.value = m.monto.toLocaleString("es-CO");
  llenarCategorias(editCategoria, m.tipo, m.categoria);
  editCategoria.value = m.categoria;
  editFecha.value = m.fecha;
  editNota.value = m.nota || "";
  marcarError(editMonto, "");
  limpiarErrorHoja(formEditar);

  focoAntesDeEditar = document.activeElement;
  hoja.hidden = false;
  fondoInerte(true);
  // Se enfoca el título y no un campo, para que no se abra el teclado del iPhone
  document.getElementById("titulo-editar").focus();
}

// devolverA: elemento que recibe el foco al cerrar (por defecto, el que abrió la hoja)
function cerrarEdicion(devolverA) {
  if (hoja.hidden) return;
  hoja.hidden = true;
  fondoInerte(false);

  let destino = devolverA;
  if (!destino && idEditando !== null) {
    // La lista se redibuja al guardar: se busca el botón del mismo movimiento
    destino = lista.querySelector('.mov[data-id="' + idEditando + '"]');
  }
  if (!destino || !document.contains(destino)) destino = focoAntesDeEditar;
  // El botón del primer uso desaparece al guardar: el foco pasa al botón flotante
  if (destino && destino.offsetParent === null) destino = btnNuevo;
  if (destino && document.contains(destino)) destino.focus({ preventScroll: true });

  idEditando = null;
  focoAntesDeEditar = null;
}

function describir(m) {
  return m.categoria + " · " + (m.tipo === "gasto" ? "-" : "+") + dinero(m.monto) + " · " + fechaCorta(m.fecha);
}

function guardarNuevo() {
  const monto = leerMonto(editMonto);
  if (!monto) return;

  const nuevo = {
    id: Date.now(),
    tipo: tipoSeleccionado("tipo-edit"),
    monto: monto,
    categoria: editCategoria.value || "Otro",
    fecha: editFecha.value || hoy(),
    nota: editNota.value.trim()
  };
  const eraPrimero = !datos.inicio;
  datos.movimientos.push(nuevo);
  if (eraPrimero) datos.inicio = new Date().toISOString();

  // Si no se pudo guardar, se quita de nuevo y la hoja sigue abierta con lo escrito
  if (!guardar()) {
    datos.movimientos.pop();
    if (eraPrimero) datos.inicio = null;
    return;
  }

  ultimoUsado.tipo = nuevo.tipo;
  ultimoUsado.categoria[nuevo.tipo] = nuevo.categoria;
  mostrar(nuevo.id);
  cerrarEdicion();

  mostrarToast(
    nuevo.tipo === "gasto" ? "Gasto guardado" : "Ingreso guardado",
    "Deshacer",
    function () {
      const i = datos.movimientos.findIndex(function (x) {
        return x.id === nuevo.id;
      });
      if (i === -1) return;
      datos.movimientos.splice(i, 1);
      if (eraPrimero) datos.inicio = null;
      guardar();
      mostrar();
      anunciar("Movimiento quitado");
      if (!btnNuevo.hidden) btnNuevo.focus({ preventScroll: true });
    },
    describir(nuevo)
  );
}

formEditar.addEventListener("submit", function (e) {
  e.preventDefault();
  if (idEditando === null) {
    guardarNuevo();
    return;
  }

  const m = datos.movimientos.find(function (x) {
    return x.id === idEditando;
  });
  if (!m) return;
  const monto = leerMonto(editMonto);
  if (!monto) return;

  const antes = Object.assign({}, m);
  m.tipo = tipoSeleccionado("tipo-edit");
  m.monto = monto;
  m.categoria = editCategoria.value || "Otro";
  m.fecha = editFecha.value;
  m.nota = editNota.value.trim();

  // Si no se pudo guardar, se deshace el cambio y la hoja sigue abierta con lo escrito
  if (!guardar()) {
    Object.assign(m, antes);
    return;
  }
  mostrar();
  cerrarEdicion();
  anunciar("Cambios guardados");
});

document.getElementById("edit-eliminar").addEventListener("click", function () {
  const indice = datos.movimientos.findIndex(function (x) {
    return x.id === idEditando;
  });
  if (indice === -1) return;

  const eliminado = datos.movimientos.splice(indice, 1)[0];
  if (!guardar()) {
    datos.movimientos.splice(indice, 0, eliminado);
    return;
  }
  mostrar();
  cerrarEdicion(document.getElementById("titulo-movimientos"));

  mostrarToast("Movimiento eliminado", "Deshacer", function () {
    datos.movimientos.push(eliminado);
    guardar();
    mostrar(eliminado.id);
  }, describir(eliminado));
});

document.getElementById("edit-cancelar").addEventListener("click", function () {
  cerrarEdicion();
});
document.getElementById("hoja-fondo").addEventListener("click", function () {
  cerrarEdicion();
});

// Esc cierra la hoja (teclado Bluetooth en iPad/iPhone o computador)
document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  if (!celebra.hidden) cerrarCelebra();
  else if (!hoja.hidden) cerrarEdicion();
  else if (!hojaCat.hidden) cerrarCategoria();
  else if (!hojaLugar.hidden) cerrarLugar();
  else if (!hojaMover.hidden) cerrarMover();
  else if (!hojaPlan.hidden) cerrarPlan();
  else if (!hojaGv.hidden) cerrarGastoViaje();
  else if (!hojaCaja.hidden) cerrarCaja();
  else if (!hojaEv.hidden) cerrarEditarViaje();
  else if (!ventanaMetas.hidden) cerrarMetas();
  else if (!ventanaViaje.hidden) cerrarViaje();
});

document.querySelectorAll('input[name="tipo-edit"]').forEach(function (r) {
  r.addEventListener("change", function () {
    llenarCategorias(editCategoria, tipoSeleccionado("tipo-edit"));
  });
});

// ---------- Gráficos ----------
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
  return { filas: filas, total: total, porCategoria: porCategoria };
}

// Tarjeta 1: los totales del periodo, una sola vez, como dos barras comparables
function dibujarBarras(mes, ing, gas) {
  const cont = document.getElementById("resumen");
  cont.innerHTML = "";

  const titulo = document.createElement("h2");
  titulo.textContent = "Ingresos y gastos · " + nombrePeriodo(mes);
  cont.appendChild(titulo);

  if (ing.total + gas.total === 0) {
    const vacio = document.createElement("p");
    vacio.className = "vacio";
    vacio.textContent = "Sin movimientos en este periodo.";
    cont.appendChild(vacio);
    return;
  }

  const maximo = Math.max(ing.total, gas.total);

  function barra(etiqueta, valor, clase) {
    const fila = document.createElement("div");
    fila.className = "barra-fila " + clase;

    const cabecera = document.createElement("div");
    cabecera.className = "barra-cabecera";
    const a = document.createElement("span");
    a.textContent = etiqueta;
    const b = document.createElement("strong");
    b.textContent = dinero(valor);
    cabecera.append(a, b);

    const pista = document.createElement("div");
    pista.className = "barra-pista";
    const relleno = document.createElement("div");
    relleno.className = "barra-relleno";
    relleno.style.width = (valor / maximo) * 100 + "%";
    pista.appendChild(relleno);

    fila.append(cabecera, pista);
    cont.appendChild(fila);
  }

  barra("Ingresos", ing.total, "barra-ingreso");
  barra("Gastos", gas.total, "barra-gasto");

  const balance = ing.total - gas.total;
  const pie = document.createElement("div");
  pie.className = "fila-resumen";
  const a = document.createElement("span");
  a.textContent = "Balance";
  const b = document.createElement("strong");
  b.textContent = conSigno(balance);
  pie.append(a, b);
  cont.appendChild(pie);

  const prefijo = todoHistorial.checked ? "" : mes;
  const aAhorro = alAhorro(prefijo);
  const aViaje = aViajes(prefijo);
  if (aAhorro) {
    const f1 = el("div", "fila-resumen fila-resumen-suave");
    f1.append(
      el("span", "", aAhorro > 0 ? "Pasado al ahorro" : "Sacado del ahorro"),
      el("strong", "", (aAhorro > 0 ? "−" : "+") + dinero(Math.abs(aAhorro)))
    );
    cont.appendChild(f1);
  }
  if (aViaje) {
    const fv = el("div", "fila-resumen fila-resumen-suave fila-resumen-viaje");
    fv.append(
      el("span", "", aViaje > 0 ? "Llevado a viajes" : "Te sobró de viajes"),
      el("strong", "", (aViaje > 0 ? "−" : "+") + dinero(Math.abs(aViaje)))
    );
    cont.appendChild(fv);
  }
  if (aAhorro || aViaje) {
    const f2 = el("div", "fila-resumen fila-resumen-disponible");
    f2.append(el("span", "", "Disponible"), el("strong", "", conSigno(balance - aAhorro - aViaje)));
    cont.appendChild(f2);
  }

  // Con una categoría elegida, se dice cuánto aporta sin cambiar los totales
  const categoria = filtroCategoria.value;
  if (categoria) {
    const enGasto = gas.porCategoria[categoria] || 0;
    const enIngreso = ing.porCategoria[categoria] || 0;
    const nota = document.createElement("p");
    nota.className = "ayuda nota-grafico";
    const partes = [];
    if (enGasto) partes.push(dinero(enGasto) + " de los gastos");
    if (enIngreso) partes.push(dinero(enIngreso) + " de los ingresos");
    nota.textContent = partes.length
      ? categoria + ": " + partes.join(" y ") + "."
      : categoria + " no tiene movimientos en este periodo.";
    cont.appendChild(nota);
  }
}

// Tarjeta 2: en qué se fue el dinero. Solo gastos.
function dibujarRueda(gas) {
  const cont = document.getElementById("grafico");
  cont.innerHTML = "";

  const tarjeta = cont.closest(".tarjeta");
  tarjeta.hidden = gas.total === 0;
  if (gas.total === 0) return;

  const seleccionada = filtroCategoria.value;
  const hayResaltado = gas.filas.some(function (f) {
    return f[0] === seleccionada;
  });

  let anillo = "";
  let acumulado = 0;
  const hueco = gas.filas.length > 1 ? 0.8 : 0;

  gas.filas.forEach(function (f, i) {
    const pct = (f[1] / gas.total) * 100;
    const trazo = Math.max(pct - hueco, 0.1);
    const opacidad = !hayResaltado || f[0] === seleccionada ? 1 : 0.2;
    anillo +=
      '<circle cx="21" cy="21" r="15.9155" fill="none" style="stroke:' +
      COLORES_GASTO[i % COLORES_GASTO.length] +
      '" stroke-opacity="' + opacidad +
      '" stroke-width="4" stroke-dasharray="' + trazo + " " + (100 - trazo) +
      '" stroke-dashoffset="' + (125 - acumulado) + '"></circle>';
    acumulado += pct;
  });

  // El centro nombra la categoría que más pesa (o la elegida), no repite el total
  const destacada = hayResaltado
    ? gas.filas.find(function (f) { return f[0] === seleccionada; })
    : gas.filas[0];
  const pctDestacada = Math.round((destacada[1] / gas.total) * 100) + "%";
  const nombre = destacada[0].length > 14 ? destacada[0].slice(0, 13) + "…" : destacada[0];
  const centro =
    '<text class="donut-total" x="21" y="22" font-size="5">' + pctDestacada + "</text>" +
    '<text class="donut-etiqueta" x="21" y="26.6" font-size="2.4"></text>';

  cont.innerHTML =
    '<svg class="donut" viewBox="0 0 42 42" role="img">' + anillo + centro + "</svg>";
  const svg = cont.querySelector("svg");
  svg.querySelector(".donut-etiqueta").textContent = nombre;
  svg.setAttribute("aria-label", destacada[0] + ", " + pctDestacada + " de los gastos");

  gas.filas.forEach(function (fila, i) {
    const div = document.createElement("div");
    div.className = "fila-leyenda";
    if (hayResaltado && fila[0] !== seleccionada) div.classList.add("atenuada");

    const punto = document.createElement("span");
    punto.className = "punto";
    punto.style.background = COLORES_GASTO[i % COLORES_GASTO.length];

    const n = document.createElement("span");
    n.className = "nombre";
    n.textContent = fila[0];

    const valor = document.createElement("span");
    valor.className = "leyenda-valor";
    valor.textContent = dinero(fila[1]);

    const porcentaje = document.createElement("span");
    porcentaje.className = "leyenda-pct";
    porcentaje.textContent = Math.round((fila[1] / gas.total) * 100) + "%";

    div.append(punto, n, valor, porcentaje);
    cont.appendChild(div);
  });
}

function mostrarGraficos() {
  const mes = inputMes.value || hoy().slice(0, 7);
  inputMes.disabled = todoHistorial.checked;
  const ing = agrupar("ingreso", mes);
  const gas = agrupar("gasto", mes);
  dibujarBarras(mes, ing, gas);
  dibujarGraficoAhorro("grafico-ahorro-graficos", "tarjeta-ahorro-graficos");
  dibujarRueda(gas);
}


// ---------- Categorías propias (Ajustes) ----------
// Cada categoría es una fila que se toca y abre su hoja (renombrar o borrar)
const hojaCat = document.getElementById("hoja-cat");
const formCat = document.getElementById("form-cat");
const catNombre = document.getElementById("cat-nombre");
const catUsos = document.getElementById("cat-usos");
// Qué categoría está abierta en la hoja: { tipo, nombre }
let catEditando = null;
let focoAntesDeCat = null;

function usosDe(tipo, nombre) {
  return datos.movimientos.filter(function (m) {
    return m.tipo === tipo && m.categoria === nombre;
  }).length;
}

function textoUsos(n) {
  return n === 0 ? "Sin movimientos" : n === 1 ? "1 movimiento" : n + " movimientos";
}

function filaCategoria(tipo, nombre) {
  return Array.prototype.find.call(
    document.querySelectorAll("#cats-" + tipo + " .fila-cat"),
    function (b) {
      return b.dataset.nombre === nombre;
    }
  );
}

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
      const usos = textoUsos(usosDe(tipo, nombre));

      const fila = document.createElement("button");
      fila.type = "button";
      fila.className = "fila-cat";
      fila.dataset.nombre = nombre;
      fila.setAttribute("aria-label", nombre + ", " + usos.toLowerCase() + ". Editar");

      const etiqueta = document.createElement("span");
      etiqueta.className = "fila-cat-nombre";
      etiqueta.textContent = nombre;

      fila.appendChild(etiqueta);
      // El número solo aparece si hay algo que contar
      if (usosDe(tipo, nombre) > 0) {
        const cuenta = document.createElement("span");
        cuenta.className = "fila-cat-usos";
        cuenta.textContent = usos;
        fila.appendChild(cuenta);
      }
      fila.insertAdjacentHTML(
        "beforeend",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"></path></svg>'
      );
      fila.addEventListener("click", function () {
        abrirCategoria(tipo, nombre);
      });
      cont.appendChild(fila);
    });
  });
}

function refrescarTodo() {
  dibujarCategorias();
  mostrar();
  dibujarAhorro();
  dibujarViajes();
}

function existeCategoria(tipo, nombre, salvo) {
  return datos.categorias[tipo].some(function (c) {
    return c !== salvo && c.toLowerCase() === nombre.toLowerCase();
  });
}

function agregarCategoria(tipo) {
  const input = document.getElementById("nueva-" + tipo);
  const nombre = input.value.trim();
  if (!nombre) return;

  // "comida" y "Comida" cuentan como la misma categoría
  if (existeCategoria(tipo, nombre)) {
    marcarError(input, "Ya tienes una categoría «" + nombre + "».");
    input.focus();
    return;
  }

  datos.categorias[tipo].push(nombre);
  if (!guardar()) {
    datos.categorias[tipo].pop();
    return;
  }
  input.value = "";
  refrescarTodo();
  anunciar("Categoría " + nombre + " añadida");
}

function abrirCategoria(tipo, nombre) {
  catEditando = { tipo: tipo, nombre: nombre };
  const usos = usosDe(tipo, nombre);

  document.getElementById("titulo-cat").textContent =
    tipo === "gasto" ? "Categoría de gasto" : "Categoría de ingreso";
  catNombre.value = nombre;
  marcarError(catNombre, "");
  limpiarErrorHoja(formCat);
  catUsos.textContent =
    usos === 0
      ? "Ningún movimiento la usa todavía."
      : (usos === 1 ? "La usa 1 movimiento" : "La usan " + usos + " movimientos") +
        ". Si la renombras, se actualiza" + (usos === 1 ? "" : "n") +
        "; si la borras, conserva" + (usos === 1 ? "" : "n") + " «" + nombre + "».";

  focoAntesDeCat = document.activeElement;
  hojaCat.hidden = false;
  fondoInerte(true);
  // El título y no el campo: así no se abre el teclado si solo se quiere borrar
  document.getElementById("titulo-cat").focus();
}

// devolverA: elemento que recibe el foco al cerrar (por defecto, la fila que la abrió)
function cerrarCategoria(devolverA) {
  if (hojaCat.hidden) return;
  hojaCat.hidden = true;
  fondoInerte(false);

  let destino = devolverA || focoAntesDeCat;
  if (destino && document.contains(destino)) destino.focus({ preventScroll: true });
  catEditando = null;
  focoAntesDeCat = null;
}

formCat.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!catEditando) return;
  const tipo = catEditando.tipo;
  const viejo = catEditando.nombre;
  const nuevo = catNombre.value.trim().slice(0, 40);

  if (!nuevo) {
    marcarError(catNombre, "Escribe un nombre.");
    catNombre.focus();
    return;
  }
  if (nuevo === viejo) {
    cerrarCategoria();
    return;
  }
  if (existeCategoria(tipo, nuevo, viejo)) {
    marcarError(catNombre, "Ya tienes una categoría «" + nuevo + "».");
    catNombre.focus();
    return;
  }

  const i = datos.categorias[tipo].indexOf(viejo);
  const cambiados = datos.movimientos.filter(function (m) {
    return m.tipo === tipo && m.categoria === viejo;
  });
  const presupuesto = tipo === "gasto" ? datos.presupuestos[viejo] : undefined;

  datos.categorias[tipo][i] = nuevo;
  cambiados.forEach(function (m) {
    m.categoria = nuevo;
  });
  if (presupuesto !== undefined) {
    datos.presupuestos[nuevo] = presupuesto;
    delete datos.presupuestos[viejo];
  }

  // Si no se pudo guardar, todo vuelve como estaba y la hoja sigue abierta
  if (!guardar()) {
    datos.categorias[tipo][i] = viejo;
    cambiados.forEach(function (m) {
      m.categoria = viejo;
    });
    if (presupuesto !== undefined) {
      datos.presupuestos[viejo] = presupuesto;
      delete datos.presupuestos[nuevo];
    }
    return;
  }

  refrescarTodo();
  cerrarCategoria(filaCategoria(tipo, nuevo));
  anunciar("Categoría renombrada a " + nuevo);
});

// Borrar no pregunta: se hace al instante y el aviso ofrece Deshacer
document.getElementById("cat-borrar").addEventListener("click", function () {
  if (!catEditando) return;
  const tipo = catEditando.tipo;
  const nombre = catEditando.nombre;
  const indice = datos.categorias[tipo].indexOf(nombre);
  if (indice === -1) return;

  datos.categorias[tipo].splice(indice, 1);
  if (!guardar()) {
    datos.categorias[tipo].splice(indice, 0, nombre);
    return;
  }
  refrescarTodo();
  cerrarCategoria(document.getElementById("titulo-cats-" + tipo));

  const usos = usosDe(tipo, nombre);
  mostrarToast(
    "Categoría borrada",
    "Deshacer",
    function () {
      // Si mientras tanto se creó otra con el mismo nombre, no se duplica
      if (existeCategoria(tipo, nombre)) return;
      datos.categorias[tipo].splice(Math.min(indice, datos.categorias[tipo].length), 0, nombre);
      guardar();
      refrescarTodo();
      const fila = filaCategoria(tipo, nombre);
      if (fila && !document.getElementById("vista-ajustes").hidden) fila.focus({ preventScroll: true });
      anunciar("Categoría " + nombre + " recuperada");
    },
    nombre + (usos ? " · " + textoUsos(usos).toLowerCase() + " la conservan" : "")
  );
});

document.getElementById("cat-cancelar").addEventListener("click", function () {
  cerrarCategoria();
});
document.getElementById("hoja-cat-fondo").addEventListener("click", function () {
  cerrarCategoria();
});

catNombre.addEventListener("input", function () {
  marcarError(catNombre, "");
});

document.querySelectorAll("[data-agregar]").forEach(function (boton) {
  boton.addEventListener("click", function () {
    agregarCategoria(boton.dataset.agregar);
  });
});

["gasto", "ingreso"].forEach(function (tipo) {
  const input = document.getElementById("nueva-" + tipo);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") agregarCategoria(tipo);
  });
  input.addEventListener("input", function () {
    marcarError(input, "");
  });
});

// ---------- Ahorro ----------
const planMonto = document.getElementById("plan-monto");
const planMeses = document.getElementById("plan-meses");
const planIncluir = document.getElementById("plan-incluir");
const hojaLugar = document.getElementById("hoja-lugar");
const formLugar = document.getElementById("form-lugar");
const lugarTipo = document.getElementById("lugar-tipo");
const lugarNombre = document.getElementById("lugar-nombre");
const lugarSaldo = document.getElementById("lugar-saldo");
const lugarTasa = document.getElementById("lugar-tasa");
const lugarVence = document.getElementById("lugar-vence");

const UNIDAD = { diario: "día", semanal: "semana", mensual: "mes" };
const HITOS = [1, 3, 6, 12, 24, 36, 60];

function leerFecha(iso) {
  const p = iso.split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function isoDe(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Suma meses sin saltarse al mes siguiente (31 ene + 1 mes = 28/29 feb)
function sumarMeses(fecha, n) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(fecha.getDate(), ultimo));
  return d;
}

function textoMeses(n) {
  if (n % 12 === 0) return n === 12 ? "1 año" : n / 12 + " años";
  return n === 1 ? "1 mes" : n + " meses";
}

function totalAhorrado() {
  return datos.ahorro.lugares.reduce(function (s, l) {
    return s + l.saldo;
  }, 0);
}

// Cuántas veces se ahorra en los próximos N meses, contando días reales del calendario
// desde (opcional): "YYYY-MM-DD" donde arranca; por defecto, hoy
function aportesEn(frecuencia, meses, desde) {
  if (frecuencia === "mensual") return meses;
  const inicio = leerFecha(desde || hoy());
  const fin = sumarMeses(inicio, meses);
  const dias = Math.round((fin - inicio) / 86400000);
  return frecuencia === "diario" ? dias : Math.floor(dias / 7);
}

function filaDato(cont, etiqueta, valor, clase) {
  const fila = document.createElement("div");
  fila.className = "fila-dato" + (clase ? " " + clase : "");
  const a = document.createElement("span");
  a.textContent = etiqueta;
  const b = document.createElement("strong");
  b.textContent = valor;
  fila.append(a, b);
  cont.appendChild(fila);
}

function dibujarProyeccion() {
  const plan = datos.ahorro.plan;
  const cont = document.getElementById("proyeccion");
  cont.innerHTML = "";

  const yaTengo = totalAhorrado();
  const base = plan.incluir ? yaTengo : 0;
  document.getElementById("plan-incluir-fila").hidden = yaTengo === 0;
  document.getElementById("plan-incluir-texto").textContent =
    "Sumar lo que ya tengo ahorrado (" + dinero(yaTengo) + ")";

  dibujarAceptar();
  if (!plan.monto) {
    const vacio = document.createElement("p");
    vacio.className = "vacio";
    vacio.textContent = "Escribe un monto para ver cuánto juntas.";
    cont.appendChild(vacio);
    return;
  }

  const veces = aportesEn(plan.frecuencia, plan.meses);
  const aportes = veces * plan.monto;
  const total = base + aportes;

  const etiqueta = document.createElement("span");
  etiqueta.className = "proyeccion-etiqueta";
  etiqueta.textContent = "En " + textoMeses(plan.meses) + " tendrías";
  const grande = document.createElement("p");
  grande.className = "proyeccion-valor";
  ponerMonto(grande, dinero(total));
  cont.append(etiqueta, grande);

  filaDato(
    cont,
    veces + " " + (veces === 1 ? "aporte" : "aportes") + " de " + dinero(plan.monto),
    dinero(aportes)
  );
  if (base) filaDato(cont, "Lo que ya tienes", dinero(base));
  if (plan.frecuencia !== "mensual") {
    filaDato(cont, "Equivale a, por mes", "≈ " + dinero(Math.round(aportes / plan.meses)), "fila-suave");
  }

  // Cómo va creciendo: hitos hasta el plazo elegido
  const hitos = HITOS.filter(function (h) {
    return h < plan.meses;
  }).concat(plan.meses);
  if (hitos.length > 1) {
    const titulo = document.createElement("p");
    titulo.className = "proyeccion-sub";
    titulo.textContent = "Cómo crece";
    cont.appendChild(titulo);

    hitos.forEach(function (h) {
      const valor = base + aportesEn(plan.frecuencia, h) * plan.monto;
      const fila = document.createElement("div");
      fila.className = "barra-fila barra-ahorro";
      const cab = document.createElement("div");
      cab.className = "barra-cabecera";
      const a = document.createElement("span");
      a.textContent = textoMeses(h);
      const b = document.createElement("strong");
      b.textContent = dinero(valor);
      cab.append(a, b);
      const pista = document.createElement("div");
      pista.className = "barra-pista";
      const relleno = document.createElement("div");
      relleno.className = "barra-relleno";
      relleno.style.width = (valor / total) * 100 + "%";
      pista.appendChild(relleno);
      fila.append(cab, pista);
      cont.appendChild(fila);
    });
  }
}

function sincronizarPlan() {
  const plan = datos.ahorro.plan;
  document.querySelector('input[name="plan-frecuencia"][value="' + plan.frecuencia + '"]').checked = true;
  document.getElementById("plan-monto-etiqueta").textContent = "Cuánto por " + UNIDAD[plan.frecuencia];
  if (document.activeElement !== planMonto) {
    planMonto.value = plan.monto ? plan.monto.toLocaleString("es-CO") : "";
  }
  if (!planMeses.querySelector('option[value="' + plan.meses + '"]')) plan.meses = 12;
  planMeses.value = String(plan.meses);
  planIncluir.checked = plan.incluir;
}

document.querySelectorAll('input[name="plan-frecuencia"]').forEach(function (r) {
  r.addEventListener("change", function () {
    datos.ahorro.plan.frecuencia = tipoSeleccionado("plan-frecuencia");
    guardar();
    sincronizarPlan();
    dibujarProyeccion();
  });
});

planMonto.addEventListener("input", function () {
  formatearMonto(planMonto);
  datos.ahorro.plan.monto = Number(planMonto.value.replace(/\D/g, "")) || 0;
  guardar();
  dibujarProyeccion();
});

planMeses.addEventListener("change", function () {
  datos.ahorro.plan.meses = Number(planMeses.value);
  guardar();
  dibujarProyeccion();
});

planIncluir.addEventListener("change", function () {
  datos.ahorro.plan.incluir = planIncluir.checked;
  guardar();
  dibujarProyeccion();
});

// Lo que un CDT rinde hasta su vencimiento (interés compuesto, antes de retención)
function rendimientoCdt(l) {
  if (l.tipo !== "CDT" || !l.tasa || !l.vence || !l.saldo) return 0;
  const dias = (new Date(l.vence + "T00:00:00") - new Date(hoy() + "T00:00:00")) / 86400000;
  if (dias <= 0) return 0;
  return Math.round(l.saldo * (Math.pow(1 + l.tasa / 100, dias / 365) - 1));
}

function fechaLarga(iso) {
  const p = iso.split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "")
    .replace(/ de /g, " ");
}

function tasaTexto(t) {
  return String(t).replace(".", ",") + "% E.A.";
}

function detalleLugar(l) {
  const partes = [];
  if (l.nombre && l.nombre !== l.tipo) partes.push(l.tipo);
  if (l.tipo === "CDT") {
    if (l.tasa) partes.push(tasaTexto(l.tasa));
    if (l.vence) {
      partes.push((l.vence < hoy() ? "venció " : "vence ") + fechaLarga(l.vence));
    }
  }
  return partes.join(" · ");
}

// Colores de la rueda de ahorro: tokens --ahorro-N de style.css (derivados de --verde)
const COLORES_AHORRO = [1, 2, 3, 4, 5, 6].map(function (n) {
  return "var(--ahorro-" + n + ")";
});

// Color de cada lugar según cuánto pesa: el que más tiene, el verde más vivo
function coloresLugares() {
  const orden = datos.ahorro.lugares
    .filter(function (l) { return l.saldo > 0; })
    .sort(function (a, b) { return b.saldo - a.saldo; });
  const mapa = {};
  orden.forEach(function (l, i) {
    mapa[l.id] = COLORES_AHORRO[Math.min(i, COLORES_AHORRO.length - 1)];
  });
  return { orden: orden, mapa: mapa };
}

// Rueda con cómo se reparte lo ahorrado; en el centro, el total
function dibujarRuedaLugares(colores, total) {
  const cont = document.getElementById("grafico-lugares");
  cont.innerHTML = "";
  if (colores.orden.length < 2 || total <= 0) return false;

  let anillo = "";
  let acumulado = 0;
  colores.orden.forEach(function (l) {
    const pct = (l.saldo / total) * 100;
    const trazo = Math.max(pct - 0.8, 0.1);
    anillo +=
      '<circle class="rueda-trozo" cx="21" cy="21" r="15.9155" fill="none" style="stroke:' + colores.mapa[l.id] +
      '" stroke-width="4.2" stroke-linecap="butt" stroke-dasharray="' + trazo + " " + (100 - trazo) +
      '" stroke-dashoffset="' + (125 - acumulado) + '"></circle>';
    acumulado += pct;
  });
  const texto = dinero(total);
  const tam = texto.length > 12 ? 3.2 : texto.length > 9 ? 3.9 : 4.6;
  cont.innerHTML =
    '<svg class="donut donut-ahorro" viewBox="0 0 42 42" role="img">' +
    '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--elevado)" stroke-width="4.2" opacity="0.35"></circle>' +
    anillo +
    '<text class="donut-etiqueta" x="21" y="17.6" font-size="2.3">Total ahorrado</text>' +
    '<text class="donut-total" x="21" y="23" font-size="' + tam + '"></text>' +
    '<text class="donut-etiqueta" x="21" y="27.4" font-size="2.3"></text>' +
    "</svg>";
  const svg = cont.querySelector("svg");
  const textos = svg.querySelectorAll("text");
  textos[1].textContent = texto;
  textos[2].textContent = "en " + colores.orden.length + " lugares";
  svg.setAttribute(
    "aria-label",
    "Total ahorrado " + texto + ". " +
      colores.orden.map(function (l) {
        return (l.nombre || l.tipo) + " " + Math.round((l.saldo / total) * 100) + "%";
      }).join(", ")
  );
  return true;
}

function dibujarLugares() {
  const cont = document.getElementById("lista-lugares");
  cont.innerHTML = "";
  const lugares = datos.ahorro.lugares;
  const total = totalAhorrado();
  const colores = coloresLugares();
  const conRueda = dibujarRuedaLugares(colores, total);

  document.getElementById("lugares-vacio").hidden = lugares.length > 0;
  document.getElementById("lugares-ayuda").hidden = lugares.length === 0;
  // Con la rueda, el total ya está en su centro
  document.getElementById("total-ahorro-fila").hidden = lugares.length === 0 || conRueda;
  ponerMonto(document.getElementById("total-ahorrado"), dinero(total));

  lugares.forEach(function (l) {
    const nombre = l.nombre || l.tipo;
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "mov fila-lugar";
    boton.dataset.id = l.id;

    const avatar = document.createElement("span");
    avatar.className = "avatar avatar-ahorro";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (nombre.trim().charAt(0) || "?").toUpperCase();

    const info = document.createElement("div");
    info.className = "fila-lugar-info";
    const titulo = document.createElement("strong");
    titulo.textContent = nombre;
    info.appendChild(titulo);
    const det = detalleLugar(l);
    if (det) {
      const small = document.createElement("small");
      small.textContent = det;
      info.appendChild(small);
    }
    const rinde = rendimientoCdt(l);
    if (rinde) {
      const r = document.createElement("small");
      r.className = "rinde";
      r.textContent = "Rinde ≈ " + dinero(rinde) + " al vencer";
      info.appendChild(r);
    }

    const lado = document.createElement("span");
    lado.className = "fila-lugar-lado";
    const monto = document.createElement("span");
    monto.className = "monto";
    monto.textContent = dinero(l.saldo);
    lado.appendChild(monto);
    if (total > 0 && lugares.length > 1) {
      const pct = document.createElement("small");
      pct.className = "fila-lugar-pct";
      if (conRueda && colores.mapa[l.id]) {
        const punto = el("span", "punto");
        punto.style.background = colores.mapa[l.id];
        pct.appendChild(punto);
      }
      pct.append(Math.round((l.saldo / total) * 100) + "%");
      lado.appendChild(pct);
    }

    boton.setAttribute(
      "aria-label",
      nombre + ", " + dinero(l.saldo) + (det ? ", " + det : "") +
        (rinde ? ", rinde aproximadamente " + dinero(rinde) + " al vencer" : "") + ". Añadir o sacar plata"
    );
    boton.append(avatar, info, lado);
    boton.addEventListener("click", function () {
      abrirMover(l.id);
    });
    cont.appendChild(boton);
  });
}

function dibujarAhorro() {
  sincronizarPlan();
  dibujarGraficoAhorro("grafico-ahorro-ahorro", "tarjeta-ahorro-ahorro");
  dibujarLugares();
  dibujarProyeccion();
  dibujarPlanes();
  dibujarResumenMetas();
  if (!hojaPlan.hidden) dibujarDetallePlan();
  if (!hojaMover.hidden) dibujarMover();
  // Mover plata al ahorro cambia lo disponible
  dibujarLiquidez();
  mostrarGraficos();
}

// ---------- Ahorros en curso ----------
const hojaPlan = document.getElementById("hoja-plan");
const planMotivo = document.getElementById("plan-motivo");
const planLugar = document.getElementById("plan-lugar");
const celebra = document.getElementById("celebra");

const ESTE_PERIODO = { diario: "de hoy", semanal: "de esta semana", mensual: "de este mes" };
const NOMBRE_PERIODO = { diario: "Día", semanal: "Semana", mensual: "Mes" };

// Premios: se ganan una sola vez por ahorro. {motivo} y {meta} se reemplazan al mostrarlos.
const LOGROS = [
  { clave: "primero", icono: "🌱", titulo: "¡Primer depósito!", texto: "Ya arrancaste a ahorrar para {motivo}. Lo más difícil es empezar, y ya lo hiciste.", cumple: function (s) { return s.n >= 1; } },
  { clave: "racha3", icono: "🔥", titulo: "¡3 seguidos!", texto: "Tres depósitos sin fallar. Le estás cogiendo el ritmo.", cumple: function (s) { return s.racha >= 3; } },
  { clave: "racha7", icono: "⚡", titulo: "¡7 seguidos!", texto: "Una racha de 7. Eso es pura disciplina.", cumple: function (s) { return s.racha >= 7; } },
  { clave: "racha15", icono: "💪", titulo: "¡15 seguidos!", texto: "Quince depósitos al hilo. Ahorrar ya es parte de tu rutina.", cumple: function (s) { return s.racha >= 15; } },
  { clave: "racha30", icono: "🏆", titulo: "¡30 seguidos!", texto: "Treinta sin fallar. Lo tuyo ya es un hábito de verdad.", cumple: function (s) { return s.racha >= 30; } },
  { clave: "pct25", icono: "🥉", titulo: "¡Llevas el 25%!", texto: "Ya recorriste un cuarto del camino hacia {motivo}.", cumple: function (s) { return s.pct >= 0.25; } },
  { clave: "pct50", icono: "🥈", titulo: "¡Mitad del camino!", texto: "Vas por la mitad de {meta}. Lo que falta es lo mismo que ya hiciste.", cumple: function (s) { return s.pct >= 0.5; } },
  { clave: "pct75", icono: "🥇", titulo: "¡Ya tienes el 75%!", texto: "Ya casi. Solo falta el último empujón para {motivo}.", cumple: function (s) { return s.pct >= 0.75; } },
  { clave: "pct100", icono: "🎉", titulo: "¡Meta cumplida!", texto: "Juntaste {meta} para {motivo}. ¡Te lo mereces!", cumple: function (s) { return s.pct >= 1; } },
  { clave: "m100k", icono: "💵", titulo: "¡$100.000 ahorrados!", texto: "Tus primeros cien mil en {motivo}. Cada peso cuenta.", cumple: function (s) { return s.ahorrado >= 100000; } },
  { clave: "m500k", icono: "💰", titulo: "¡$500.000 ahorrados!", texto: "Medio millón. Eso ya es plata seria.", cumple: function (s) { return s.ahorrado >= 500000; } },
  { clave: "m1M", icono: "💎", titulo: "¡Tu primer millón!", texto: "Un millón de pesos ahorrados en {motivo}. ¡Qué orgullo!", cumple: function (s) { return s.ahorrado >= 1000000; } },
  { clave: "m5M", icono: "👑", titulo: "¡5 millones!", texto: "Cinco millones juntos. Pocos llegan hasta aquí.", cumple: function (s) { return s.ahorrado >= 5000000; } }
];

function buscarPlan(id) {
  return datos.ahorro.planes.find(function (p) {
    return p.id === id;
  });
}

function buscarLugar(id) {
  return id
    ? datos.ahorro.lugares.find(function (l) {
        return l.id === id;
      })
    : null;
}

function totalPeriodos(p) {
  return Math.max(1, aportesEn(p.frecuencia, p.meses, p.inicio));
}

// Fecha en que empieza el periodo k (0 = el día que se aceptó el ahorro)
function fechaPeriodo(p, k) {
  const d = leerFecha(p.inicio);
  if (p.frecuencia === "mensual") return sumarMeses(d, k);
  d.setDate(d.getDate() + (p.frecuencia === "semanal" ? 7 * k : k));
  return d;
}

// Periodo en el que estamos hoy (el último que ya empezó), sin pasarse del final
function periodoActual(p) {
  const total = totalPeriodos(p);
  const hoyD = leerFecha(hoy());
  let k;
  if (p.frecuencia === "mensual") {
    k = 0;
    while (k + 1 < total && fechaPeriodo(p, k + 1) <= hoyD) k++;
  } else {
    const dias = Math.round((hoyD - leerFecha(p.inicio)) / 86400000);
    k = p.frecuencia === "semanal" ? Math.floor(dias / 7) : dias;
  }
  return Math.max(-1, Math.min(k, total - 1));
}

function estadoPlan(p) {
  const total = totalPeriodos(p);
  const actual = periodoActual(p);
  const n = Object.keys(p.depositos).length;
  const ahorrado = n * p.monto;
  const meta = total * p.monto;

  // La racha no se rompe mientras el periodo actual siga abierto
  let racha = 0;
  let k = p.depositos[actual] ? actual : actual - 1;
  while (k >= 0 && p.depositos[k]) {
    racha++;
    k--;
  }

  let pendientes = 0;
  for (let i = 0; i < actual; i++) if (!p.depositos[i]) pendientes++;

  const fin = sumarMeses(leerFecha(p.inicio), p.meses);
  return {
    total: total,
    actual: actual,
    n: n,
    ahorrado: ahorrado,
    meta: meta,
    pct: meta ? ahorrado / meta : 0,
    racha: racha,
    pendientes: pendientes,
    terminado: leerFecha(hoy()) >= fin,
    fin: isoDe(fin)
  };
}

function textoLogro(l, p, s) {
  return l.texto.replace("{motivo}", p.motivo).replace("{meta}", dinero(s.meta));
}

function nombreDeposito(p, k, actual) {
  const d = fechaPeriodo(p, k);
  if (k === actual) {
    return p.frecuencia === "diario" ? "Hoy" : p.frecuencia === "semanal" ? "Esta semana" : "Este mes";
  }
  if (p.frecuencia === "mensual") {
    return mayuscula(d.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).replace(" de ", " "));
  }
  const corta = fechaCorta(isoDe(d));
  if (p.frecuencia === "semanal") return "Semana del " + corta;
  const dia = d.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "");
  return corta === "ayer" ? "Ayer" : mayuscula(dia) + " " + corta;
}

// Lo que sale de un elemento con texto, para no repetir createElement por todos lados
function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// ¿Le toca confirmar el depósito del periodo de hoy?
function esperaDeposito(p, s) {
  return s.pct < 1 && s.actual >= 0 && !p.depositos[s.actual];
}

// Tarjeta corta en la pantalla de Ahorro: una barra por meta, sin importar cuántas sean
const MAX_BARRAS_RESUMEN = 5;

function dibujarResumenMetas() {
  const tarjeta = document.getElementById("resumen-metas");
  const planes = datos.ahorro.planes;
  tarjeta.hidden = planes.length === 0;
  if (!planes.length) return;

  let lleva = 0;
  let meta = 0;
  let esperan = 0;
  const estados = planes.map(function (p) {
    const s = estadoPlan(p);
    lleva += Math.min(s.ahorrado, s.meta);
    meta += s.meta;
    if (esperaDeposito(p, s)) esperan++;
    return { p: p, s: s };
  });

  // Total de todas las metas
  const total = document.getElementById("metas-total");
  total.innerHTML = "";
  const grande = el("strong", "metas-total-valor");
  ponerMonto(grande, dinero(lleva));
  const pctTotal = meta ? Math.round((lleva / meta) * 100) : 0;
  total.append(grande, el("span", "plan-de", "de " + dinero(meta) + " · " + pctTotal + "%"));

  // Barras
  const cont = document.getElementById("metas-barras");
  cont.innerHTML = "";
  estados.slice(0, MAX_BARRAS_RESUMEN).forEach(function (e, i) {
    const p = e.p;
    const s = e.s;
    const pct = Math.min(100, Math.round(s.pct * 100));
    // Dónde debería ir hoy si se deposita a tiempo
    const ideal = Math.min(100, ((s.actual + 1) / s.total) * 100);

    const fila = el("button", "meta-barra" + (s.pct >= 1 ? " cumplida" : ""));
    fila.type = "button";
    fila.style.setProperty("--retraso", i * 70 + "ms");
    const cab = el("span", "meta-barra-cab");
    const nombre = el("span", "meta-barra-nombre", p.motivo);
    const cifra = el("span", "meta-barra-pct", s.pct >= 1 ? "✓ 100%" : pct + "%");
    cab.append(nombre, cifra);

    const pista = el("span", "meta-barra-pista");
    const relleno = el("span", "meta-barra-relleno");
    relleno.style.setProperty("--ancho", pct + "%");
    pista.appendChild(relleno);
    if (s.pct < 1 && s.actual >= 0) {
      const marca = el("span", "meta-barra-ideal");
      marca.style.left = ideal + "%";
      pista.appendChild(marca);
    }

    const pie = el("span", "meta-barra-pie");
    pie.append(
      el("span", "", dinero(s.ahorrado) + " de " + dinero(s.meta)),
      el("span", esperaDeposito(p, s) ? "meta-barra-toca" : "", esperaDeposito(p, s)
        ? "Falta " + { diario: "hoy", semanal: "esta semana", mensual: "este mes" }[p.frecuencia]
        : s.racha ? "🔥 " + s.racha : "")
    );

    fila.append(cab, pista, pie);
    fila.setAttribute(
      "aria-label",
      p.motivo + ": " + pct + "%, " + dinero(s.ahorrado) + " de " + dinero(s.meta) +
        (esperaDeposito(p, s) ? ". Falta confirmar el depósito " + ESTE_PERIODO[p.frecuencia] : "") + ". Abrir"
    );
    fila.addEventListener("click", function () {
      abrirMetas(p.id);
    });
    cont.appendChild(fila);
  });

  const restantes = planes.length - MAX_BARRAS_RESUMEN;
  document.getElementById("btn-ver-metas-texto").textContent =
    restantes > 0 ? "Ver las " + planes.length : planes.length > 1 ? "Ver todas" : "Abrir";
  document.getElementById("metas-leyenda").hidden = !estados.some(function (e) {
    return e.s.pct < 1 && e.s.actual >= 0;
  });

  const aviso = document.getElementById("metas-aviso");
  aviso.hidden = esperan === 0;
  aviso.textContent = esperan === 1
    ? "1 meta espera tu depósito. Toca para confirmarlo."
    : esperan + " metas esperan tu depósito. Toca para confirmarlos.";
}

// --- Ventana con todas las metas ---
let focoAntesDeMetas = null;

function abrirMetas(idPlan) {
  if (ventanaMetas.hidden) {
    focoAntesDeMetas = document.activeElement;
    ventanaMetas.hidden = false;
    document.body.classList.add("con-ventana");
    fondoInerte(false);
  }
  dibujarPlanes();
  const tarjeta = idPlan ? ventanaMetas.querySelector('.plan[data-id="' + idPlan + '"]') : null;
  if (tarjeta) {
    ventanaMetas.scrollTop = 0;
    tarjeta.scrollIntoView({ block: "start" });
    ventanaMetas.scrollTop -= 72;
    const foco = tarjeta.querySelector(".btn-confirmar") || tarjeta.querySelector(".plan-ver");
    if (foco) foco.focus({ preventScroll: true });
    tarjeta.classList.remove("resalta");
    void tarjeta.offsetWidth;
    tarjeta.classList.add("resalta");
  } else {
    ventanaMetas.scrollTop = 0;
    document.getElementById("titulo-ventana-metas").focus({ preventScroll: true });
  }
}

function cerrarMetas(devolverA) {
  if (ventanaMetas.hidden) return;
  ventanaMetas.hidden = true;
  document.body.classList.remove("con-ventana");
  fondoInerte(false);
  let destino = devolverA || focoAntesDeMetas;
  if (!destino || !document.contains(destino) || destino.offsetParent === null) {
    destino = document.getElementById("btn-ver-metas");
  }
  if (destino && destino.offsetParent !== null) destino.focus({ preventScroll: true });
  else document.getElementById("titulo-proyecta").focus({ preventScroll: true });
  focoAntesDeMetas = null;
}

document.getElementById("btn-ver-metas").addEventListener("click", function () {
  abrirMetas(null);
});
document.getElementById("metas-aviso").addEventListener("click", function () {
  const primero = datos.ahorro.planes.find(function (p) {
    return esperaDeposito(p, estadoPlan(p));
  });
  abrirMetas(primero ? primero.id : null);
});
document.getElementById("metas-volver").addEventListener("click", function () {
  cerrarMetas();
});
document.getElementById("btn-nueva-meta").addEventListener("click", function () {
  const titulo = document.getElementById("titulo-proyecta");
  cerrarMetas(titulo);
  titulo.scrollIntoView({ behavior: "smooth", block: "start" });
});

function dibujarPlanes() {
  const cont = document.getElementById("mis-planes");
  cont.innerHTML = "";
  const n = datos.ahorro.planes.length;
  document.getElementById("metas-cuenta").textContent = n === 0
    ? "Todavía no tienes metas. Crea una en Proyecta tu ahorro."
    : n === 1 ? "1 meta en curso" : n + " metas en curso";

  datos.ahorro.planes.forEach(function (p) {
    const s = estadoPlan(p);
    const pct = Math.min(100, Math.round(s.pct * 100));
    const tarjeta = el("article", "tarjeta plan");
    tarjeta.dataset.id = p.id;

    // Cabecera: motivo + acceso al detalle
    const cabeza = el("div", "plan-cabeza");
    const textos = el("div", "plan-titulos");
    textos.append(el("span", "plan-etiqueta", "Ahorrando para"), el("h2", "plan-motivo", p.motivo));
    const ver = el("button", "plan-ver", "Detalle");
    ver.type = "button";
    ver.setAttribute("aria-label", "Ver detalle y premios de " + p.motivo);
    ver.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"></path></svg>');
    ver.addEventListener("click", function () {
      abrirPlan(p.id);
    });
    cabeza.append(textos, ver);

    // Cuánto lleva
    const cifras = el("div", "plan-cifras");
    const lleva = el("strong", "plan-lleva");
    ponerMonto(lleva, dinero(s.ahorrado));
    cifras.append(lleva, el("span", "plan-de", "de " + dinero(s.meta)), el("span", "plan-pct", pct + "%"));

    const pista = el("div", "barra-pista plan-pista");
    pista.setAttribute("role", "progressbar");
    pista.setAttribute("aria-label", "Avance hacia " + p.motivo);
    pista.setAttribute("aria-valuemin", "0");
    pista.setAttribute("aria-valuemax", "100");
    pista.setAttribute("aria-valuenow", String(pct));
    const relleno = el("div", "barra-relleno");
    relleno.style.width = pct + "%";
    pista.appendChild(relleno);

    const datosFila = el("div", "plan-datos");
    datosFila.append(
      el("span", "plan-racha" + (s.racha ? " activa" : ""), (s.racha ? "🔥 Racha de " + s.racha : "Sin racha aún")),
      el("span", "", NOMBRE_PERIODO[p.frecuencia] + " " + (s.actual + 1) + " de " + s.total + " · " + dinero(p.monto))
    );

    tarjeta.append(cabeza, cifras, pista, datosFila);

    // La acción del periodo actual
    if (s.pct >= 1) {
      tarjeta.appendChild(el("p", "plan-hecho", "🎉 ¡Meta cumplida! Juntaste " + dinero(s.ahorrado) + "."));
    } else if (s.actual >= 0 && !p.depositos[s.actual]) {
      const btn = el("button", "btn-principal btn-ancho btn-confirmar");
      btn.type = "button";
      btn.textContent = "Ya ahorré " + { diario: "hoy", semanal: "esta semana", mensual: "este mes" }[p.frecuencia] + " · " + dinero(p.monto);
      btn.setAttribute("aria-label", "Confirmar depósito " + ESTE_PERIODO[p.frecuencia] + " de " + dinero(p.monto) + " para " + p.motivo);
      btn.addEventListener("click", function () {
        confirmarDeposito(p.id, s.actual);
      });
      tarjeta.appendChild(btn);
    } else if (s.actual >= 0) {
      tarjeta.appendChild(
        el("p", "plan-hecho", "✓ Depósito " + ESTE_PERIODO[p.frecuencia] + " confirmado. ¡Bien hecho!")
      );
    }

    if (s.pendientes > 0) {
      const aviso = el("button", "plan-pendientes");
      aviso.type = "button";
      const unidad = NOMBRE_PERIODO[p.frecuencia].toLowerCase();
      const plural = { día: "días", semana: "semanas", mes: "meses" }[unidad];
      aviso.textContent =
        (s.pendientes === 1 ? "1 " + unidad + " anterior sin confirmar" : s.pendientes + " " + plural + " anteriores sin confirmar") +
        ". ¿Sí depositaste?";
      aviso.addEventListener("click", function () {
        abrirPlan(p.id);
      });
      tarjeta.appendChild(aviso);
    }

    // Premios ganados, en pequeño
    if (p.logros.length) {
      const fila = el("div", "plan-medallas");
      fila.setAttribute("aria-label", p.logros.length + (p.logros.length === 1 ? " premio" : " premios"));
      LOGROS.forEach(function (l) {
        if (p.logros.indexOf(l.clave) !== -1) {
          const m = el("span", "medalla-mini", l.icono);
          m.title = l.titulo;
          m.setAttribute("aria-hidden", "true");
          fila.appendChild(m);
        }
      });
      tarjeta.appendChild(fila);
    }

    cont.appendChild(tarjeta);
  });
}

// --- Aceptar la proyección ---
function dibujarAceptar() {
  const plan = datos.ahorro.plan;
  document.getElementById("plan-aceptar").hidden = !plan.monto;

  const lugares = datos.ahorro.lugares;
  document.getElementById("plan-lugar-fila").hidden = lugares.length === 0;
  const previo = planLugar.value;
  planLugar.innerHTML = "";
  const ninguno = el("option", "", "Todavía no sé");
  ninguno.value = "";
  planLugar.appendChild(ninguno);
  lugares.forEach(function (l) {
    const op = el("option", "", l.nombre || l.tipo);
    op.value = String(l.id);
    planLugar.appendChild(op);
  });
  if (planLugar.querySelector('option[value="' + previo + '"]')) planLugar.value = previo;

  const porPeriodo = { diario: "Cada día", semanal: "Cada semana", mensual: "Cada mes" }[plan.frecuencia];
  document.getElementById("plan-aceptar-ayuda").textContent =
    porPeriodo + " te pediremos confirmar que guardaste " + dinero(plan.monto || 0) +
    ". Si eliges dónde lo guardas, cada depósito se suma ahí.";
}

document.getElementById("btn-empezar").addEventListener("click", function () {
  const plan = datos.ahorro.plan;
  if (!plan.monto) return;
  const motivo = planMotivo.value.trim().slice(0, 40) || "Mi ahorro";
  const lugarId = planLugar.value ? Number(planLugar.value) : null;

  const nuevo = {
    id: Date.now(),
    motivo: motivo,
    monto: plan.monto,
    frecuencia: plan.frecuencia,
    meses: plan.meses,
    inicio: hoy(),
    lugarId: buscarLugar(lugarId) ? lugarId : null,
    depositos: {},
    logros: []
  };
  datos.ahorro.planes.unshift(nuevo);
  if (!guardar()) {
    datos.ahorro.planes.shift();
    return;
  }
  planMotivo.value = "";
  dibujarAhorro();
  window.scrollTo({ top: 0 });
  // La meta nueva se muestra en su ventana, lista para el primer depósito
  abrirMetas(nuevo.id);
  mostrarToast("Ahorro creado", "", null, motivo + " · " + dinero(nuevo.monto) + " " + {
    diario: "al día", semanal: "a la semana", mensual: "al mes"
  }[nuevo.frecuencia]);
});

// --- Confirmar y quitar depósitos ---
// Anota un cambio de saldo en el lugar (lo más reciente primero, con tope)
// fuera: true si solo anota plata que ya estaba ahorrada (no sale de la liquidez)
function anotarCambio(lugar, monto, nota, fuera) {
  const h = { fecha: hoy(), monto: monto, nota: nota || "" };
  if (fuera) h.fuera = true;
  lugar.historial.unshift(h);
  if (lugar.historial.length > MAX_HISTORIAL) lugar.historial.length = MAX_HISTORIAL;
}

function moverSaldo(p, signo) {
  const lugar = buscarLugar(p.lugarId);
  if (!lugar) return;
  lugar.saldo = Math.max(0, lugar.saldo + signo * p.monto);
  if (signo > 0) {
    anotarCambio(lugar, p.monto, p.motivo);
  } else {
    // Quitar un depósito borra su anotación en vez de sumar otra en negativo
    const i = lugar.historial.findIndex(function (h) {
      return h.monto === p.monto && h.nota === p.motivo;
    });
    if (i !== -1) lugar.historial.splice(i, 1);
  }
}

function confirmarDeposito(id, k) {
  const p = buscarPlan(id);
  if (!p || p.depositos[k]) return;

  p.depositos[k] = hoy();
  moverSaldo(p, 1);
  const s = estadoPlan(p);
  const nuevos = LOGROS.filter(function (l) {
    return p.logros.indexOf(l.clave) === -1 && l.cumple(s);
  });
  nuevos.forEach(function (l) {
    p.logros.push(l.clave);
  });

  if (!guardar()) {
    delete p.depositos[k];
    moverSaldo(p, -1);
    p.logros = p.logros.filter(function (c) {
      return !nuevos.some(function (l) { return l.clave === c; });
    });
    return;
  }
  dibujarAhorro();

  const lugar = buscarLugar(p.lugarId);
  mostrarToast("Depósito confirmado", "Deshacer", function () {
    quitarDeposito(id, k);
  }, p.motivo + " · +" + dinero(p.monto) + (lugar ? " en " + (lugar.nombre || lugar.tipo) : ""));

  if (nuevos.length) {
    celebrar(nuevos.map(function (l) {
      return { icono: l.icono, titulo: l.titulo, texto: textoLogro(l, p, s) };
    }));
  } else {
    // Sin premio nuevo, un ánimo corto en el aviso basta
    anunciar("Depósito confirmado. Llevas " + dinero(s.ahorrado) + " para " + p.motivo);
  }
}

function quitarDeposito(id, k) {
  const p = buscarPlan(id);
  if (!p || !p.depositos[k]) return;
  const fecha = p.depositos[k];
  delete p.depositos[k];
  moverSaldo(p, -1);
  if (!guardar()) {
    p.depositos[k] = fecha;
    moverSaldo(p, 1);
    return;
  }
  dibujarAhorro();
  anunciar("Depósito quitado");
}

// --- Detalle del ahorro ---
let planAbierto = null;
let focoAntesDePlan = null;

function dibujarDetallePlan() {
  const p = buscarPlan(planAbierto);
  if (!p) return;
  const s = estadoPlan(p);
  const lugar = buscarLugar(p.lugarId);

  document.getElementById("titulo-plan").textContent = p.motivo;
  document.getElementById("plan-resumen").textContent =
    dinero(p.monto) + " " + { diario: "cada día", semanal: "cada semana", mensual: "cada mes" }[p.frecuencia] +
    ", del " + fechaLarga(p.inicio) + " al " + fechaLarga(s.fin) + ". " +
    "Llevas " + dinero(s.ahorrado) + " de " + dinero(s.meta) + " (" + s.n + " de " + s.total + " depósitos)." +
    (lugar ? " Se guarda en " + (lugar.nombre || lugar.tipo) + "." : "");

  // Todos los premios: los ganados brillan, los demás muestran qué falta
  const premios = document.getElementById("plan-premios");
  premios.innerHTML = "";
  LOGROS.forEach(function (l) {
    const ganado = p.logros.indexOf(l.clave) !== -1;
    const item = el("div", "premio" + (ganado ? " ganado" : ""));
    item.append(el("span", "premio-icono", ganado ? l.icono : "🔒"), el("span", "premio-nombre", l.titulo.replace(/[¡!]/g, "")));
    item.setAttribute("aria-label", l.titulo.replace(/[¡!]/g, "") + (ganado ? ", ganado" : ", por ganar"));
    item.setAttribute("role", "img");
    premios.appendChild(item);
  });

  // Depósitos hasta hoy, el más reciente primero
  const lista = document.getElementById("plan-depositos");
  lista.innerHTML = "";
  for (let k = s.actual; k >= 0; k--) {
    const hecho = !!p.depositos[k];
    const fila = el("button", "deposito" + (hecho ? " hecho" : ""));
    fila.type = "button";
    fila.setAttribute("aria-pressed", hecho ? "true" : "false");
    const nombre = nombreDeposito(p, k, s.actual);
    fila.append(
      el("span", "deposito-check", hecho ? "✓" : ""),
      el("span", "deposito-nombre", nombre),
      el("span", "deposito-monto", dinero(p.monto))
    );
    fila.setAttribute("aria-label", nombre + ", " + dinero(p.monto) + (hecho ? ", depositado" : ", sin confirmar"));
    fila.addEventListener("click", function () {
      if (p.depositos[k]) quitarDeposito(p.id, k);
      else confirmarDeposito(p.id, k);
      const misma = document.querySelectorAll("#plan-depositos .deposito")[s.actual - k];
      if (misma && hojaPlan.hidden === false && celebra.hidden) misma.focus({ preventScroll: true });
    });
    lista.appendChild(fila);
  }
}

function abrirPlan(id) {
  planAbierto = id;
  limpiarErrorHoja(document.getElementById("form-plan"));
  focoAntesDePlan = document.activeElement;
  hojaPlan.hidden = false;
  fondoInerte(true);
  dibujarDetallePlan();
  document.getElementById("form-plan").scrollTop = 0;
  document.getElementById("titulo-plan").focus();
}

function cerrarPlan(devolverA) {
  if (hojaPlan.hidden) return;
  hojaPlan.hidden = true;
  fondoInerte(false);
  let destino = devolverA;
  if (!destino) destino = document.querySelector('.plan[data-id="' + planAbierto + '"] .plan-ver');
  if (!destino || !document.contains(destino)) destino = focoAntesDePlan;
  if (destino && document.contains(destino)) destino.focus({ preventScroll: true });
  planAbierto = null;
  focoAntesDePlan = null;
}

document.getElementById("form-plan").addEventListener("submit", function (e) {
  e.preventDefault();
});
document.getElementById("plan-cerrar").addEventListener("click", function () {
  cerrarPlan();
});
document.getElementById("hoja-plan-fondo").addEventListener("click", function () {
  cerrarPlan();
});

document.getElementById("plan-eliminar").addEventListener("click", function () {
  const i = datos.ahorro.planes.findIndex(function (p) {
    return p.id === planAbierto;
  });
  if (i === -1) return;
  const eliminado = datos.ahorro.planes.splice(i, 1)[0];
  if (!guardar()) {
    datos.ahorro.planes.splice(i, 0, eliminado);
    return;
  }
  cerrarPlan(document.getElementById(ventanaMetas.hidden ? "titulo-proyecta" : "titulo-ventana-metas"));
  dibujarAhorro();
  // Lo ya depositado sigue en su lugar de ahorro: borrar el plan no saca la plata
  mostrarToast("Ahorro eliminado", "Deshacer", function () {
    datos.ahorro.planes.splice(Math.min(i, datos.ahorro.planes.length), 0, eliminado);
    guardar();
    dibujarAhorro();
  }, eliminado.motivo + " · lo depositado sigue en su lugar");
});

// --- Felicitaciones ---
let colaCelebra = [];
let focoAntesDeCelebra = null;

function lanzarConfeti() {
  const cont = document.getElementById("confeti");
  cont.innerHTML = "";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colores = ["var(--verde)", "var(--marca)", "#facc15", "var(--rojo)", "#f2f2f4"];
  for (let i = 0; i < 36; i++) {
    const pieza = el("span");
    pieza.style.left = Math.random() * 100 + "%";
    pieza.style.background = colores[i % colores.length];
    pieza.style.animationDelay = Math.random() * 0.5 + "s";
    pieza.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    pieza.style.setProperty("--giro", Math.round(Math.random() * 720 - 360) + "deg");
    pieza.style.setProperty("--deriva", Math.round(Math.random() * 80 - 40) + "px");
    cont.appendChild(pieza);
  }
}

function mostrarSiguienteCelebra() {
  const c = colaCelebra.shift();
  if (!c) return false;
  document.getElementById("celebra-icono").textContent = c.icono;
  document.getElementById("celebra-titulo").textContent = c.titulo;
  document.getElementById("celebra-texto").textContent = c.texto;
  document.getElementById("celebra-ok").textContent = colaCelebra.length ? "Siguiente premio" : "¡Sigamos!";
  const caja = celebra.querySelector(".celebra-caja");
  caja.classList.remove("entra");
  void caja.offsetWidth;
  caja.classList.add("entra");
  lanzarConfeti();
  document.getElementById("celebra-titulo").focus();
  return true;
}

function celebrar(lista) {
  const abierta = !celebra.hidden;
  colaCelebra = colaCelebra.concat(lista);
  if (abierta) return;
  focoAntesDeCelebra = document.activeElement;
  celebra.hidden = false;
  fondoInerte(true);
  hojaPlan.inert = true;
  mostrarSiguienteCelebra();
}

function cerrarCelebra() {
  if (celebra.hidden) return;
  if (mostrarSiguienteCelebra()) return;
  celebra.hidden = true;
  hojaPlan.inert = false;
  // Si se celebró desde el detalle, lo de atrás sigue bloqueado por esa hoja
  if (hojaPlan.hidden) fondoInerte(false);
  const destino = focoAntesDeCelebra;
  if (destino && document.contains(destino) && destino.offsetParent !== null) destino.focus({ preventScroll: true });
  else if (!hojaPlan.hidden) document.getElementById("titulo-plan").focus();
  else {
    const card = document.querySelector("#mis-planes .plan-ver");
    if (card) card.focus({ preventScroll: true });
  }
  focoAntesDeCelebra = null;
}

document.getElementById("celebra-ok").addEventListener("click", cerrarCelebra);
document.getElementById("celebra-fondo").addEventListener("click", function () {
  colaCelebra = [];
  cerrarCelebra();
});

// --- Hoja para añadir o sacar plata de un lugar ---
const hojaMover = document.getElementById("hoja-mover");
const formMover = document.getElementById("form-mover");
const moverMonto = document.getElementById("mover-monto");
let lugarMoviendo = null;
let focoAntesDeMover = null;

function moverEntra() {
  return tipoSeleccionado("mover-tipo") === "entra";
}

function montoMover() {
  return Number(moverMonto.value.replace(/\D/g, "")) || 0;
}

// Dice cómo queda el saldo y ajusta el botón a lo que se va a hacer
function dibujarVistaPrevia() {
  const l = buscarLugar(lugarMoviendo);
  if (!l) return;
  const monto = montoMover();
  const entra = moverEntra();
  const queda = document.getElementById("mover-queda");
  const boton = document.getElementById("mover-guardar");
  boton.classList.toggle("btn-sale", !entra);
  if (!monto) {
    queda.textContent = "";
    boton.textContent = entra ? "Añadir" : "Sacar";
    return;
  }
  const final = entra ? l.saldo + monto : l.saldo - monto;
  boton.textContent = (entra ? "Añadir " : "Sacar ") + dinero(monto);
  queda.textContent = "";
  if (final < 0) {
    queda.className = "mover-queda negativo";
    queda.textContent = "Solo tienes " + dinero(l.saldo) + " aquí.";
    return;
  }
  queda.className = "mover-queda " + (entra ? "sube" : "baja");
  queda.append("Quedará en ");
  queda.appendChild(el("strong", "", dinero(final)));
}

function dibujarMover() {
  const l = buscarLugar(lugarMoviendo);
  if (!l) return;
  const nombre = l.nombre || l.tipo;
  document.getElementById("titulo-mover").textContent = nombre;
  document.getElementById("mover-avatar").textContent = (nombre.trim().charAt(0) || "?").toUpperCase();
  const det = detalleLugar(l);
  const detalle = document.getElementById("mover-detalle");
  detalle.textContent = det;
  detalle.hidden = !det;
  ponerMonto(document.getElementById("mover-saldo"), dinero(l.saldo));
  dibujarVistaPrevia();

  const hist = document.getElementById("mover-historial");
  hist.innerHTML = "";
  document.getElementById("mover-hist-titulo").hidden = l.historial.length === 0;
  l.historial.slice(0, 8).forEach(function (h) {
    const sube = h.monto > 0;
    const fila = el("div", "cambio " + (sube ? "sube" : "baja"));
    const icono = el("span", "cambio-icono", sube ? "+" : "−");
    icono.setAttribute("aria-hidden", "true");
    const info = el("span", "cambio-info");
    info.append(
      el("span", "cambio-nota", h.nota || (sube ? "Añadí" : "Saqué")),
      el("small", "", mayuscula(fechaCorta(h.fecha)))
    );
    fila.append(icono, info, el("span", "cambio-monto", (sube ? "+" : "−") + dinero(Math.abs(h.monto))));
    hist.appendChild(fila);
  });
}

function abrirMover(id) {
  const l = buscarLugar(id);
  if (!l) return;
  lugarMoviendo = id;
  document.querySelector('input[name="mover-tipo"][value="entra"]').checked = true;
  moverMonto.value = "";
  marcarError(moverMonto, "");
  limpiarErrorHoja(formMover);
  dibujarMover();
  focoAntesDeMover = document.activeElement;
  hojaMover.hidden = false;
  fondoInerte(true);
  formMover.scrollTop = 0;
  document.getElementById("titulo-mover").focus();
}

function cerrarMover(devolverA) {
  if (hojaMover.hidden) return;
  hojaMover.hidden = true;
  fondoInerte(false);
  let destino = devolverA;
  if (!destino) destino = document.querySelector('.fila-lugar[data-id="' + lugarMoviendo + '"]');
  if (!destino || !document.contains(destino)) destino = focoAntesDeMover;
  if (destino && document.contains(destino)) destino.focus({ preventScroll: true });
  lugarMoviendo = null;
  focoAntesDeMover = null;
}

formMover.addEventListener("submit", function (e) {
  e.preventDefault();
  const l = buscarLugar(lugarMoviendo);
  if (!l) return;
  const monto = leerMonto(moverMonto);
  if (!monto) return;
  const entra = moverEntra();
  if (!entra && monto > l.saldo) {
    marcarError(moverMonto, "No puedes sacar más de lo que hay: " + dinero(l.saldo) + ".");
    moverMonto.focus();
    return;
  }

  const cambio = entra ? monto : -monto;
  const antes = { saldo: l.saldo, historial: l.historial.slice() };
  l.saldo += cambio;
  anotarCambio(l, cambio, entra ? "Añadí" : "Saqué");
  if (!guardar()) {
    l.saldo = antes.saldo;
    l.historial = antes.historial;
    return;
  }
  const id = l.id;
  const nombre = l.nombre || l.tipo;
  dibujarAhorro();
  cerrarMover();
  mostrarToast(entra ? "Plata añadida" : "Plata sacada", "Deshacer", function () {
    const x = buscarLugar(id);
    if (!x) return;
    x.saldo = Math.max(0, x.saldo - cambio);
    const i = x.historial.findIndex(function (h) {
      return h.monto === cambio;
    });
    if (i !== -1) x.historial.splice(i, 1);
    guardar();
    dibujarAhorro();
    anunciar("Cambio deshecho");
  }, nombre + " · " + (entra ? "+" : "−") + dinero(monto) + " · ahora " + dinero(l.saldo));
});

document.querySelectorAll('input[name="mover-tipo"]').forEach(function (r) {
  r.addEventListener("change", function () {
    marcarError(moverMonto, "");
    dibujarVistaPrevia();
  });
});
moverMonto.addEventListener("input", function () {
  formatearMonto(moverMonto);
  dibujarVistaPrevia();
});
document.getElementById("mover-cerrar").addEventListener("click", function () {
  cerrarMover();
});
document.getElementById("hoja-mover-fondo").addEventListener("click", function () {
  cerrarMover();
});
document.getElementById("mover-editar").addEventListener("click", function () {
  const id = lugarMoviendo;
  const fila = document.querySelector('.fila-lugar[data-id="' + id + '"]');
  cerrarMover();
  abrirLugar(id);
  // Al cerrar la edición, el foco vuelve a la fila del lugar
  focoAntesDeLugar = fila;
});

// --- Hoja de un lugar de ahorro (nuevo o editar) ---
let lugarEditando = null;
let focoAntesDeLugar = null;

function mostrarCamposCdt() {
  document.getElementById("lugar-cdt").hidden = lugarTipo.value !== "CDT";
  if (lugarTipo.value !== "CDT") marcarError(lugarTasa, "");
}

function abrirLugar(id) {
  const l = id
    ? datos.ahorro.lugares.find(function (x) {
        return x.id === id;
      })
    : null;
  lugarEditando = l ? l.id : null;

  document.getElementById("titulo-lugar").textContent = l ? "Editar lugar de ahorro" : "Nuevo lugar de ahorro";
  document.getElementById("lugar-guardar").textContent = l ? "Guardar cambios" : "Guardar";
  document.getElementById("lugar-eliminar").hidden = !l;
  document.getElementById("lugar-acciones").classList.toggle("una-accion", !l);

  lugarTipo.value = l ? l.tipo : "Alcancía";
  lugarNombre.value = l ? l.nombre : "";
  lugarSaldo.value = l && l.saldo ? l.saldo.toLocaleString("es-CO") : "";
  lugarTasa.value = l && l.tasa ? String(l.tasa).replace(".", ",") : "";
  lugarVence.value = l ? l.vence : "";
  marcarError(lugarSaldo, "");
  marcarError(lugarTasa, "");
  limpiarErrorHoja(formLugar);
  mostrarCamposCdt();

  focoAntesDeLugar = document.activeElement;
  hojaLugar.hidden = false;
  fondoInerte(true);
  document.getElementById("titulo-lugar").focus();
}

function cerrarLugar(devolverA) {
  if (hojaLugar.hidden) return;
  hojaLugar.hidden = true;
  fondoInerte(false);

  let destino = devolverA;
  if (!destino && lugarEditando !== null) {
    destino = document.querySelector('.fila-lugar[data-id="' + lugarEditando + '"]');
  }
  if (!destino || !document.contains(destino)) destino = focoAntesDeLugar;
  if (destino && document.contains(destino)) destino.focus({ preventScroll: true });
  lugarEditando = null;
  focoAntesDeLugar = null;
}

function leerTasa() {
  const texto = lugarTasa.value.trim().replace(",", ".");
  if (!texto || lugarTipo.value !== "CDT") return 0;
  const t = Number(texto);
  if (!isFinite(t) || t < 0 || t > 100) {
    marcarError(lugarTasa, "Escribe la tasa como un número, por ejemplo 10,5.");
    lugarTasa.focus();
    return -1;
  }
  return t;
}

formLugar.addEventListener("submit", function (e) {
  e.preventDefault();
  const tasa = leerTasa();
  if (tasa < 0) return;

  const esCdt = lugarTipo.value === "CDT";
  const valores = {
    tipo: lugarTipo.value,
    nombre: lugarNombre.value.trim().slice(0, 40),
    saldo: Number(lugarSaldo.value.replace(/\D/g, "")) || 0,
    tasa: esCdt ? tasa : 0,
    vence: esCdt ? lugarVence.value : ""
  };

  if (lugarEditando === null) {
    const nuevo = Object.assign({ id: Date.now(), historial: [] }, valores);
    if (nuevo.saldo > 0) anotarCambio(nuevo, nuevo.saldo, "Saldo inicial", true);
    datos.ahorro.lugares.push(nuevo);
    if (!guardar()) {
      datos.ahorro.lugares.pop();
      return;
    }
    dibujarAhorro();
    cerrarLugar(document.querySelector('.fila-lugar[data-id="' + nuevo.id + '"]'));
    mostrarToast("Lugar de ahorro guardado", "", null, (nuevo.nombre || nuevo.tipo) + " · " + dinero(nuevo.saldo));
    return;
  }

  const l = datos.ahorro.lugares.find(function (x) {
    return x.id === lugarEditando;
  });
  if (!l) return;
  const antes = Object.assign({}, l, { historial: l.historial.slice() });
  if (valores.saldo !== l.saldo) anotarCambio(l, valores.saldo - l.saldo, "Ajuste del saldo", true);
  Object.assign(l, valores);
  if (!guardar()) {
    Object.assign(l, antes);
    return;
  }
  dibujarAhorro();
  cerrarLugar();
  anunciar("Cambios guardados");
});

document.getElementById("lugar-eliminar").addEventListener("click", function () {
  const i = datos.ahorro.lugares.findIndex(function (x) {
    return x.id === lugarEditando;
  });
  if (i === -1) return;
  const eliminado = datos.ahorro.lugares.splice(i, 1)[0];
  if (!guardar()) {
    datos.ahorro.lugares.splice(i, 0, eliminado);
    return;
  }
  dibujarAhorro();
  cerrarLugar(document.getElementById("titulo-lugares"));
  mostrarToast("Lugar eliminado", "Deshacer", function () {
    datos.ahorro.lugares.splice(Math.min(i, datos.ahorro.lugares.length), 0, eliminado);
    guardar();
    dibujarAhorro();
  }, (eliminado.nombre || eliminado.tipo) + " · " + dinero(eliminado.saldo));
});

document.getElementById("btn-nuevo-lugar").addEventListener("click", function () {
  abrirLugar(null);
});
document.getElementById("lugar-cancelar").addEventListener("click", function () {
  cerrarLugar();
});
document.getElementById("hoja-lugar-fondo").addEventListener("click", function () {
  cerrarLugar();
});
lugarTipo.addEventListener("change", mostrarCamposCdt);
lugarSaldo.addEventListener("input", function () {
  formatearMonto(lugarSaldo);
});
lugarTasa.addEventListener("input", function () {
  marcarError(lugarTasa, "");
});

// ---------- Viajes ----------
// La plata con la que se viaja sale del disponible al empezar (caja +) y lo que
// sobra vuelve al regresar (caja −). Los gastos del viaje se pagan con esa plata,
// así que no se cuentan dos veces; solo si se gasta más de lo llevado, el excedente
// también sale del disponible.
const viajeNombre = document.getElementById("viaje-nombre");
const viajeDias = document.getElementById("viaje-dias");
const viajePorDia = document.getElementById("viaje-por-dia");
const viajeLlevo = document.getElementById("viaje-llevo");
const viajeInicio = document.getElementById("viaje-inicio");

const FLECHA_VER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"></path></svg>';

function numero(input) {
  return Number(input.value.replace(/\D/g, "")) || 0;
}

function sumarDias(iso, n) {
  const d = leerFecha(iso);
  d.setDate(d.getDate() + n);
  return isoDe(d);
}

function diasEntre(a, b) {
  return Math.round((leerFecha(b) - leerFecha(a)) / 86400000);
}

// "19 nov"
function diaMes(iso) {
  return leerFecha(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" }).replace(".", "");
}

// "mié"
function diaSemana(iso) {
  return leerFecha(iso).toLocaleDateString("es-CO", { weekday: "short" }).replace(".", "");
}

function finViaje(v) {
  return sumarDias(v.inicio, v.dias - 1);
}

function rangoFechas(v) {
  return v.dias === 1 ? diaMes(v.inicio) : diaMes(v.inicio) + " – " + diaMes(finViaje(v));
}

function textoDias(n) {
  return n === 1 ? "1 día" : n + " días";
}

function buscarViaje(id) {
  return datos.viajes.find(function (v) {
    return v.id === id;
  });
}

function cuentasViaje(v) {
  let llevado = 0;
  let devuelto = 0;
  v.caja.forEach(function (c) {
    if (c.monto > 0) llevado += c.monto;
    else devuelto -= c.monto;
  });
  const gastado = v.gastos.reduce(function (s, g) {
    return s + g.monto;
  }, 0);
  const neto = llevado - devuelto;
  return { llevado: llevado, devuelto: devuelto, neto: neto, gastado: gastado, queda: neto - gastado };
}

// Lo que el viaje le quita a la plata disponible en el periodo ("" = todo el historial)
function efectoViaje(v, prefijo) {
  let total = 0;
  v.caja.forEach(function (c) {
    if (c.fecha.startsWith(prefijo)) total += c.monto;
  });
  const c = cuentasViaje(v);
  if (c.queda < 0 && v.gastos.length) {
    const ultima = v.gastos.reduce(function (m, g) {
      return g.fecha > m ? g.fecha : m;
    }, "");
    if (ultima.startsWith(prefijo)) total += -c.queda;
  }
  return total;
}

function aViajes(prefijo) {
  return datos.viajes.reduce(function (s, v) {
    return s + efectoViaje(v, prefijo);
  }, 0);
}

// La plata que todavía está en el bolsillo de los viajes
function plataEnViajes() {
  return datos.viajes.reduce(function (s, v) {
    return s + Math.max(0, cuentasViaje(v).queda);
  }, 0);
}

function estadoViaje(v) {
  const c = cuentasViaje(v);
  const dia = diasEntre(v.inicio, hoy()) + 1;
  const fase = v.terminado ? "terminado" : dia < 1 ? "antes" : dia > v.dias ? "despues" : "durante";
  const gastoHoy = v.gastos.reduce(function (s, g) {
    return g.fecha === hoy() ? s + g.monto : s;
  }, 0);
  const restantes = fase === "durante" ? v.dias - dia + 1 : fase === "antes" ? v.dias : 0;
  // Lo que se puede gastar cada día que falta (contando hoy entero) para que alcance
  const sugerido = restantes ? Math.floor(Math.max(c.queda + (fase === "durante" ? gastoHoy : 0), 0) / restantes) : 0;
  return { c: c, dia: dia, fase: fase, gastoHoy: gastoHoy, restantes: restantes, sugerido: sugerido };
}

function etiquetaFase(v, e) {
  if (e.fase === "terminado") return "Terminado";
  if (e.fase === "durante") return "Día " + e.dia + " de " + v.dias;
  if (e.fase === "antes") return e.dia === 0 ? "Sales mañana" : "Sales en " + textoDias(1 - e.dia);
  return "Ya pasaron tus fechas";
}

// Cifra grande de lo que queda, barra de lo gastado y cómo va hoy
function bloqueSaldo(v, e) {
  const c = e.c;
  const caja = el("div", "viaje-bloque");

  const cifras = el("div", "viaje-cifras");
  cifras.appendChild(el("span", "viaje-cifras-etiqueta", c.queda < 0 ? "Te pasaste por" : e.fase === "terminado" ? "Gastaste" : "Te queda"));
  const fila = el("div", "viaje-cifras-fila");
  const grande = el("strong", "viaje-queda" + (c.queda < 0 ? " negativo" : ""));
  ponerMonto(grande, dinero(e.fase === "terminado" && c.queda >= 0 ? c.gastado : Math.abs(c.queda)));
  fila.appendChild(grande);
  if (e.fase !== "terminado") fila.appendChild(el("span", "plan-de", "de " + dinero(c.neto)));
  cifras.appendChild(fila);
  caja.appendChild(cifras);

  if (e.fase !== "terminado" && c.neto > 0) {
    const pista = el("div", "barra-pista viaje-pista");
    const relleno = el("div", "barra-relleno");
    relleno.style.width = Math.min(c.gastado / c.neto, 1) * 100 + "%";
    if (!c.gastado) relleno.style.minWidth = "0";
    pista.appendChild(relleno);
    pista.setAttribute("aria-hidden", "true");
    caja.appendChild(pista);
  }

  const datosFila = el("div", "plan-datos");
  const derecha = e.fase === "terminado"
    ? (c.devuelto ? "Devolviste " + dinero(c.devuelto) : "Llevaste " + dinero(c.llevado))
    : v.porDia ? "Presupuesto " + dinero(v.porDia * v.dias) : textoDias(v.dias);
  datosFila.append(el("span", "", "Gastado " + dinero(c.gastado)), el("span", "", derecha));
  caja.appendChild(datosFila);

  // Hoy, frente al presupuesto por día
  if (e.fase === "durante" && v.porDia) {
    const hoyCaja = el("div", "viaje-hoy");
    const cab = el("div", "barra-cabecera");
    cab.append(el("span", "", "Hoy"), el("strong", "", dinero(e.gastoHoy) + " de " + dinero(v.porDia)));
    const pista = el("div", "barra-pista");
    pista.setAttribute("aria-hidden", "true");
    const relleno = el("div", "barra-relleno");
    relleno.style.width = Math.min(e.gastoHoy / v.porDia, 1) * 100 + "%";
    if (!e.gastoHoy) relleno.style.minWidth = "0";
    pista.appendChild(relleno);
    const pasado = e.gastoHoy > v.porDia;
    hoyCaja.classList.toggle("pasado", pasado);
    const nota = el(
      "p",
      "viaje-nota",
      pasado
        ? "Hoy te pasaste por " + dinero(e.gastoHoy - v.porDia) + "."
        : "Te quedan " + dinero(v.porDia - e.gastoHoy) + " para hoy."
    );
    hoyCaja.append(cab, pista, nota);
    caja.appendChild(hoyCaja);
  }

  if (e.restantes > 1 && v.porDia && c.queda > 0) {
    const bien = e.sugerido >= v.porDia;
    caja.appendChild(
      el(
        "p",
        "viaje-nota" + (bien ? " bien" : " ojo"),
        (bien ? "Vas bien: te alcanza para " : "Para que te alcance: ") +
          dinero(e.sugerido) + " por día los " + e.restantes + " días que faltan."
      )
    );
  }
  return caja;
}

// --- Planear ---
function diasPlan() {
  const n = parseInt(viajeDias.value.replace(/\D/g, ""), 10);
  return n >= 1 ? Math.min(n, MAX_DIAS_VIAJE) : 0;
}

function dibujarPlanViaje() {
  const dias = diasPlan();
  const porDia = numero(viajePorDia);
  const total = dias * porDia;
  viajeLlevo.placeholder = total ? dinero(total) : "$0";
  const llevo = numero(viajeLlevo) || total;

  document.querySelectorAll("#atajos-dias button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(Number(b.dataset.dias) === dias));
  });
  document.querySelectorAll("#atajos-por-dia button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(Number(b.dataset.monto) === porDia));
  });
  document.getElementById("viaje-dias-menos").disabled = dias <= 1;
  document.getElementById("viaje-dias-mas").disabled = dias >= MAX_DIAS_VIAJE;

  const boton = document.getElementById("btn-empezar-viaje");
  boton.textContent = llevo && dias ? "Empezar viaje · sacar " + dinero(llevo) : "Empezar viaje";

  const cont = document.getElementById("viaje-resumen");
  cont.innerHTML = "";
  if (!dias || !llevo) {
    cont.appendChild(el("p", "vacio", "Elige los días y cuánto por día para ver tu presupuesto."));
    return;
  }

  if (total) {
    cont.appendChild(el("span", "proyeccion-etiqueta", "Presupuesto del viaje"));
    const valor = el("p", "proyeccion-valor viaje-total");
    ponerMonto(valor, dinero(total));
    cont.appendChild(valor);
    cont.appendChild(el("p", "viaje-formula", textoDias(dias) + " × " + dinero(porDia) + " por día"));
  }

  filaDato(cont, "Te llevas", dinero(llevo));
  if (total && llevo !== total) {
    const dif = llevo - total;
    if (dif > 0) filaDato(cont, "De colchón por si acaso", "+" + dinero(dif));
    else filaDato(cont, "Con eso alcanzas para", dinero(Math.floor(llevo / dias)) + " por día", "fila-ojo");
  }
  if (!total) filaDato(cont, "Te alcanza para", dinero(Math.floor(llevo / dias)) + " por día");

  const disp = disponibleTotal();
  const queda = disp - llevo;
  filaDato(cont, "Tu plata disponible queda en", conSigno(queda), queda < 0 ? "fila-negativa" : "");
  if (queda < 0) {
    cont.appendChild(
      el("p", "ayuda viaje-aviso", "Es más de lo que tienes disponible (" + conSigno(disp) + "). Igual puedes empezarlo.")
    );
  }
}

function ponerDiasPlan(n) {
  viajeDias.value = String(Math.max(1, Math.min(MAX_DIAS_VIAJE, n)));
  marcarError(viajeDias, "");
  dibujarPlanViaje();
}

document.getElementById("viaje-dias-menos").addEventListener("click", function () {
  ponerDiasPlan((diasPlan() || 1) - 1);
});
document.getElementById("viaje-dias-mas").addEventListener("click", function () {
  ponerDiasPlan(diasPlan() + 1);
});
document.querySelectorAll("#atajos-dias button").forEach(function (b) {
  b.addEventListener("click", function () {
    ponerDiasPlan(Number(b.dataset.dias));
  });
});
document.querySelectorAll("#atajos-por-dia button").forEach(function (b) {
  b.addEventListener("click", function () {
    viajePorDia.value = Number(b.dataset.monto).toLocaleString("es-CO");
    marcarError(viajePorDia, "");
    dibujarPlanViaje();
  });
});
viajeDias.addEventListener("input", function () {
  viajeDias.value = viajeDias.value.replace(/\D/g, "").slice(0, 2);
  marcarError(viajeDias, "");
  dibujarPlanViaje();
});
viajePorDia.addEventListener("input", function () {
  formatearMonto(viajePorDia);
  dibujarPlanViaje();
});
viajeLlevo.addEventListener("input", function () {
  formatearMonto(viajeLlevo);
  marcarError(viajePorDia, "");
  dibujarPlanViaje();
});

document.getElementById("btn-empezar-viaje").addEventListener("click", function () {
  const dias = diasPlan();
  if (!dias) {
    marcarError(viajeDias, "Elige de 1 a " + MAX_DIAS_VIAJE + " días.");
    viajeDias.focus();
    return;
  }
  const porDia = numero(viajePorDia);
  const llevo = numero(viajeLlevo) || dias * porDia;
  if (!llevo) {
    marcarError(viajePorDia, "Escribe cuánto vas a gastar por día o con cuánto viajas.");
    viajePorDia.focus();
    return;
  }
  const inicio = viajeInicio.value || hoy();
  const v = {
    id: Date.now(),
    nombre: viajeNombre.value.trim().slice(0, 40) || "Mi viaje",
    dias: dias,
    porDia: porDia,
    inicio: inicio,
    // Si el viaje ya empezó, la plata se anota desde el primer día
    caja: [{ id: Date.now(), fecha: inicio < hoy() ? inicio : hoy(), monto: llevo, nota: "Salió de tu disponible" }],
    gastos: [],
    terminado: null
  };
  datos.viajes.unshift(v);
  if (!guardar()) {
    datos.viajes.shift();
    return;
  }
  viajeNombre.value = "";
  viajeLlevo.value = "";
  viajeInicio.value = hoy();
  refrescarViajes();
  abrirViaje(v.id);
  mostrarToast("Viaje empezado", "Deshacer", function () {
    const i = datos.viajes.indexOf(v);
    if (i === -1) return;
    datos.viajes.splice(i, 1);
    guardar();
    if (viajeAbierto === v.id) cerrarViaje(document.getElementById("titulo-planear"));
    refrescarViajes();
    anunciar("Viaje quitado. La plata volvió a tu disponible");
  }, v.nombre + " · −" + dinero(llevo) + " de tu disponible");
});

// --- Pantalla de Viajes ---
function tarjetaViaje(v) {
  const e = estadoViaje(v);
  const t = el("div", "tarjeta viaje-card");
  t.dataset.id = v.id;
  const cab = el("div", "plan-cabeza");
  const tit = el("div", "plan-titulos");
  tit.append(el("span", "plan-etiqueta", etiquetaFase(v, e) + " · " + rangoFechas(v)), el("h2", "plan-motivo", v.nombre));
  const ver = el("button", "plan-ver", "Ver");
  ver.type = "button";
  ver.insertAdjacentHTML("beforeend", FLECHA_VER);
  ver.setAttribute("aria-label", "Ver el viaje " + v.nombre);
  ver.addEventListener("click", function () {
    abrirViaje(v.id);
  });
  cab.append(tit, ver);
  t.append(cab, bloqueSaldo(v, e));

  const anotar = el("button", "btn-principal btn-ancho btn-anotar", "Anotar gasto");
  anotar.type = "button";
  anotar.addEventListener("click", function () {
    abrirGastoViaje(v.id, null);
  });
  t.appendChild(anotar);
  if (e.fase === "despues") {
    const regreso = el("button", "btn-sec btn-ancho btn-volver-plata", "Ya regresé · devolver lo que sobró");
    regreso.type = "button";
    regreso.addEventListener("click", function () {
      abrirViaje(v.id);
      abrirCaja("devolver");
    });
    t.appendChild(regreso);
  }
  return t;
}

function dibujarViajes() {
  const activos = datos.viajes.filter(function (v) { return !v.terminado; });
  const anteriores = datos.viajes.filter(function (v) { return v.terminado; });

  const cont = document.getElementById("viajes-activos");
  cont.innerHTML = "";
  activos.forEach(function (v) {
    cont.appendChild(tarjetaViaje(v));
  });
  document.getElementById("titulo-planear").textContent = activos.length ? "Planea otro viaje" : "Planea un viaje";

  const lista = document.getElementById("viajes-anteriores");
  lista.innerHTML = "";
  document.getElementById("tarjeta-anteriores").hidden = anteriores.length === 0;
  anteriores.forEach(function (v) {
    const c = cuentasViaje(v);
    const b = el("button", "mov fila-lugar fila-viaje");
    b.type = "button";
    b.dataset.id = v.id;
    const avatar = el("span", "avatar", (v.nombre.trim().charAt(0) || "?").toUpperCase());
    avatar.setAttribute("aria-hidden", "true");
    const info = el("div", "fila-lugar-info");
    info.append(el("strong", "", v.nombre), el("small", "", textoDias(v.dias) + " · " + rangoFechas(v)));
    const lado = el("span", "fila-lugar-lado");
    lado.append(el("span", "monto", dinero(c.gastado)), el("small", "", c.devuelto ? "volvieron " + dinero(c.devuelto) : "gastado"));
    b.append(avatar, info, lado);
    b.setAttribute("aria-label", v.nombre + ", " + textoDias(v.dias) + ", gastaste " + dinero(c.gastado) + ". Ver viaje");
    b.addEventListener("click", function () {
      abrirViaje(v.id);
    });
    lista.appendChild(b);
  });

  dibujarPlanViaje();
  if (!ventanaViaje.hidden) dibujarVentanaViaje();
}

// Lo que cambia con un viaje: la pantalla, la liquidez y Gráficos
function refrescarViajes() {
  dibujarViajes();
  dibujarLiquidez();
  mostrarGraficos();
}

// --- Ventana de un viaje ---
let viajeAbierto = null;
let focoAntesDeViaje = null;
// Categoría elegida en la rueda para ver solo esos gastos
let filtroViaje = "";

function abrirViaje(id) {
  if (!buscarViaje(id)) return;
  if (viajeAbierto !== id) filtroViaje = "";
  viajeAbierto = id;
  if (ventanaViaje.hidden) {
    focoAntesDeViaje = document.activeElement;
    ventanaViaje.hidden = false;
    document.body.classList.add("con-ventana");
    fondoInerte(false);
  }
  dibujarVentanaViaje();
  ventanaViaje.scrollTop = 0;
  document.getElementById("titulo-ventana-viaje").focus({ preventScroll: true });
}

function cerrarViaje(devolverA) {
  if (ventanaViaje.hidden) return;
  const id = viajeAbierto;
  ventanaViaje.hidden = true;
  document.body.classList.remove("con-ventana");
  fondoInerte(false);
  viajeAbierto = null;
  let destino = devolverA;
  if (!destino) destino = document.querySelector('.viaje-card[data-id="' + id + '"] .plan-ver, .fila-viaje[data-id="' + id + '"]');
  if (!destino || !document.contains(destino)) destino = focoAntesDeViaje;
  if (!destino || !document.contains(destino) || destino.offsetParent === null) destino = document.getElementById("titulo-planear");
  destino.focus({ preventScroll: true });
  focoAntesDeViaje = null;
}

document.getElementById("viaje-volver").addEventListener("click", function () {
  cerrarViaje();
});

function dibujarVentanaViaje() {
  const v = buscarViaje(viajeAbierto);
  if (!v) {
    cerrarViaje();
    return;
  }
  const e = estadoViaje(v);
  const terminado = e.fase === "terminado";
  document.getElementById("titulo-ventana-viaje").textContent = v.nombre;
  document.getElementById("viaje-sub").textContent =
    etiquetaFase(v, e) + " · " + rangoFechas(v) + (v.porDia ? " · " + dinero(v.porDia) + " por día" : "");

  const saldo = document.getElementById("viaje-saldo");
  saldo.innerHTML = "";
  saldo.appendChild(bloqueSaldo(v, e));
  document.getElementById("btn-gasto-viaje").hidden = terminado;

  dibujarDiasViaje(v);
  dibujarRuedaViaje(v);
  dibujarGastosViaje(v);
  dibujarCajaViaje(v, e);
}

// Columnas de lo gastado cada día, con una rayita en el presupuesto por día
function dibujarDiasViaje(v) {
  const cont = document.getElementById("viaje-grafico-dias");
  cont.innerHTML = "";
  const porFecha = {};
  v.gastos.forEach(function (g) {
    porFecha[g.fecha] = (porFecha[g.fecha] || 0) + g.monto;
  });
  const columnas = [];
  for (let i = 0; i < v.dias; i++) {
    const f = sumarDias(v.inicio, i);
    columnas.push({ fecha: f, total: porFecha[f] || 0, arriba: diaSemana(f), abajo: String(leerFecha(f).getDate()), nombre: "Día " + (i + 1) });
    delete porFecha[f];
  }
  const fuera = Object.keys(porFecha).reduce(function (s, k) {
    return s + porFecha[k];
  }, 0);
  if (fuera) columnas.push({ fecha: "", total: fuera, arriba: "otras", abajo: "fechas", nombre: "Otras fechas" });

  const maximo = Math.max.apply(null, columnas.map(function (c) { return c.total; }).concat(v.porDia)) || 1;
  const scroll = el("div", "viaje-cols-scroll");
  const cols = el("div", "cols-ahorro cols-viaje");
  cols.style.minWidth = columnas.length > 8 ? columnas.length * 40 + "px" : "";
  cols.setAttribute("role", "img");
  cols.setAttribute(
    "aria-label",
    "Gasto por día" + (v.porDia ? ", presupuesto " + dinero(v.porDia) + " por día" : "") + ": " +
      columnas.map(function (c) { return c.nombre + " " + dinero(c.total); }).join(", ")
  );
  let pasados = 0;
  columnas.forEach(function (c) {
    const pasado = v.porDia && c.total > v.porDia;
    if (pasado) pasados++;
    const col = el("div", "col-ahorro col-viaje" + (c.fecha === hoy() ? " actual" : "") + (pasado ? " pasado" : ""));
    col.setAttribute("aria-hidden", "true");
    col.appendChild(el("span", "col-valor", c.total ? dineroCorto(c.total) : "–"));
    const pista = el("div", "col-pista");
    const barra = el("div", "col-barra");
    barra.style.height = Math.max((c.total / maximo) * 100, c.total ? 4 : 0) + "%";
    pista.appendChild(barra);
    if (v.porDia && c.fecha) {
      const tope = el("span", "col-tope");
      tope.style.bottom = (v.porDia / maximo) * 100 + "%";
      pista.appendChild(tope);
    }
    col.appendChild(pista);
    const etiqueta = el("span", "col-mes col-dia");
    etiqueta.append(el("span", "", c.arriba), el("b", "", c.abajo));
    col.appendChild(etiqueta);
    cols.appendChild(col);
  });
  scroll.appendChild(cols);
  cont.appendChild(scroll);

  if (v.porDia) {
    const ley = el("p", "metas-leyenda viaje-leyenda");
    const marca = el("span", "metas-leyenda-marca viaje-leyenda-marca");
    marca.setAttribute("aria-hidden", "true");
    ley.append(marca, "Tu presupuesto: " + dinero(v.porDia) + " por día" +
      (pasados ? " · te pasaste " + (pasados === 1 ? "1 día" : pasados + " días") : ""));
    cont.appendChild(ley);
  }
}

function agruparViaje(v) {
  const por = {};
  v.gastos.forEach(function (g) {
    por[g.categoria] = (por[g.categoria] || 0) + g.monto;
  });
  const filas = Object.entries(por).sort(function (a, b) { return b[1] - a[1]; });
  const total = filas.reduce(function (s, f) { return s + f[1]; }, 0);
  return { filas: filas, total: total };
}

// Rueda de en qué se gastó; tocar una categoría deja ver solo esos gastos
function dibujarRuedaViaje(v) {
  const cont = document.getElementById("viaje-rueda");
  cont.innerHTML = "";
  const g = agruparViaje(v);
  document.getElementById("viaje-tarjeta-rueda").hidden = g.total === 0;
  if (g.total === 0) {
    filtroViaje = "";
    return;
  }
  if (filtroViaje && !g.filas.some(function (f) { return f[0] === filtroViaje; })) filtroViaje = "";

  let anillo = "";
  let acumulado = 0;
  const hueco = g.filas.length > 1 ? 0.8 : 0;
  g.filas.forEach(function (f, i) {
    const pct = (f[1] / g.total) * 100;
    const trazo = Math.max(pct - hueco, 0.1);
    const opacidad = !filtroViaje || f[0] === filtroViaje ? 1 : 0.2;
    anillo +=
      '<circle cx="21" cy="21" r="15.9155" fill="none" style="stroke:' + COLORES_GASTO[i % COLORES_GASTO.length] +
      '" stroke-opacity="' + opacidad + '" stroke-width="4" stroke-dasharray="' + trazo + " " + (100 - trazo) +
      '" stroke-dashoffset="' + (125 - acumulado) + '"></circle>';
    acumulado += pct;
  });
  const destacada = filtroViaje
    ? g.filas.find(function (f) { return f[0] === filtroViaje; })
    : null;
  const texto = destacada ? dinero(destacada[1]) : dinero(g.total);
  const tam = texto.length > 12 ? 3.2 : texto.length > 9 ? 3.9 : 4.6;
  cont.innerHTML =
    '<svg class="donut donut-ahorro" viewBox="0 0 42 42" role="img">' + anillo +
    '<text class="donut-total" x="21" y="22.4" font-size="' + tam + '"></text>' +
    '<text class="donut-etiqueta" x="21" y="26.8" font-size="2.4"></text></svg>';
  const svg = cont.querySelector("svg");
  const textos = svg.querySelectorAll("text");
  textos[0].textContent = texto;
  const etiqueta = destacada ? destacada[0] : "gastado";
  textos[1].textContent = etiqueta.length > 14 ? etiqueta.slice(0, 13) + "…" : etiqueta;
  svg.setAttribute(
    "aria-label",
    "Gastado " + dinero(g.total) + ". " +
      g.filas.map(function (f) { return f[0] + " " + Math.round((f[1] / g.total) * 100) + "%"; }).join(", ")
  );

  g.filas.forEach(function (f, i) {
    const b = el("button", "fila-leyenda fila-leyenda-btn");
    b.type = "button";
    b.setAttribute("aria-pressed", String(f[0] === filtroViaje));
    if (filtroViaje && f[0] !== filtroViaje) b.classList.add("atenuada");
    const punto = el("span", "punto");
    punto.style.background = COLORES_GASTO[i % COLORES_GASTO.length];
    b.append(
      punto,
      el("span", "nombre", f[0]),
      el("span", "leyenda-valor", dinero(f[1])),
      el("span", "leyenda-pct", Math.round((f[1] / g.total) * 100) + "%")
    );
    b.addEventListener("click", function () {
      filtroViaje = filtroViaje === f[0] ? "" : f[0];
      dibujarRuedaViaje(v);
      dibujarGastosViaje(v);
      const mismo = cont.querySelectorAll(".fila-leyenda-btn")[i];
      if (mismo) mismo.focus({ preventScroll: true });
    });
    cont.appendChild(b);
  });
  if (g.filas.length > 1) {
    cont.appendChild(el("p", "ayuda viaje-ayuda-rueda", filtroViaje ? "Toca de nuevo para ver todo." : "Toca una categoría para ver solo esos gastos."));
  }
}

function dibujarGastosViaje(v) {
  const cont = document.getElementById("viaje-gastos");
  cont.innerHTML = "";
  const todos = v.gastos.slice().sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha) || b.id - a.id;
  });
  const visibles = filtroViaje ? todos.filter(function (g) { return g.categoria === filtroViaje; }) : todos;
  document.getElementById("viaje-gastos-vacio").hidden = todos.length > 0;
  document.getElementById("viaje-gastos-ayuda").hidden = todos.length === 0;
  document.getElementById("titulo-gastos-viaje").textContent = filtroViaje ? "Gastos en " + filtroViaje : "Gastos del viaje";

  visibles.forEach(function (g) {
    const n = diasEntre(v.inicio, g.fecha) + 1;
    const cuando = n >= 1 && n <= v.dias ? "Día " + n + " · " + diaSemana(g.fecha) + " " + diaMes(g.fecha) : diaMes(g.fecha);
    const b = el("button", "mov fila-lugar fila-gasto-viaje");
    b.type = "button";
    b.dataset.id = g.id;
    const avatar = el("span", "avatar", (g.categoria.trim().charAt(0) || "?").toUpperCase());
    avatar.setAttribute("aria-hidden", "true");
    const info = el("div", "fila-lugar-info");
    info.append(el("strong", "", g.categoria), el("small", "", cuando + (g.nota ? " · " + g.nota : "")));
    b.append(avatar, info, el("span", "monto", "−" + dinero(g.monto)));
    b.setAttribute("aria-label", g.categoria + ", " + dinero(g.monto) + ", " + cuando + (g.nota ? ", " + g.nota : "") + ". Editar");
    b.addEventListener("click", function () {
      abrirGastoViaje(v.id, g.id);
    });
    cont.appendChild(b);
  });
}

function dibujarCajaViaje(v, e) {
  const cont = document.getElementById("viaje-caja");
  cont.innerHTML = "";
  const terminado = e.fase === "terminado";
  v.caja.slice().sort(function (a, b) {
    return b.fecha.localeCompare(a.fecha) || b.id - a.id;
  }).forEach(function (c) {
    const sale = c.monto > 0;
    const fila = el("div", "cambio " + (sale ? "lleva" : "vuelve"));
    const icono = el("span", "cambio-icono", sale ? "↗" : "↩");
    icono.setAttribute("aria-hidden", "true");
    const info = el("span", "cambio-info");
    info.append(
      el("span", "cambio-nota", sale ? "Llevaste de tu disponible" : "Volvió a tu disponible"),
      el("small", "", mayuscula(fechaCorta(c.fecha)))
    );
    fila.append(icono, info, el("span", "cambio-monto", dinero(Math.abs(c.monto))));
    cont.appendChild(fila);
  });
  document.getElementById("viaje-caja-botones").hidden = terminado;
  document.getElementById("btn-viaje-reabrir").hidden = !terminado;
  document.getElementById("btn-viaje-devolver").textContent = e.c.queda > 0 ? "Regresé · devolver" : "Regresé · terminar";
}

document.getElementById("btn-gasto-viaje").addEventListener("click", function () {
  abrirGastoViaje(viajeAbierto, null);
});
document.getElementById("btn-viaje-mas").addEventListener("click", function () {
  abrirCaja("mas");
});
document.getElementById("btn-viaje-devolver").addEventListener("click", function () {
  abrirCaja("devolver");
});
document.getElementById("btn-viaje-reabrir").addEventListener("click", function () {
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  const antes = v.terminado;
  v.terminado = null;
  if (!guardar()) {
    v.terminado = antes;
    return;
  }
  refrescarViajes();
  document.getElementById("titulo-caja-viaje").focus({ preventScroll: true });
  mostrarToast("Viaje reabierto", "", null, "Puedes seguir anotando gastos");
});

document.getElementById("btn-viaje-eliminar").addEventListener("click", function () {
  const i = datos.viajes.findIndex(function (v) { return v.id === viajeAbierto; });
  if (i === -1) return;
  const eliminado = datos.viajes.splice(i, 1)[0];
  if (!guardar()) {
    datos.viajes.splice(i, 0, eliminado);
    return;
  }
  cerrarViaje(document.getElementById("titulo-planear"));
  refrescarViajes();
  mostrarToast("Viaje eliminado", "Deshacer", function () {
    datos.viajes.splice(Math.min(i, datos.viajes.length), 0, eliminado);
    guardar();
    refrescarViajes();
  }, eliminado.nombre + " · su plata volvió a tu disponible");
});

// --- Hoja de un gasto del viaje ---
const hojaGv = document.getElementById("hoja-gv");
const formGv = document.getElementById("form-gv");
const gvMonto = document.getElementById("gv-monto");
const gvCats = document.getElementById("gv-cats");
const gvOtra = document.getElementById("gv-otra");
const gvDia = document.getElementById("gv-dia");
const gvNota = document.getElementById("gv-nota");
const NUEVA_CAT = "__nueva";
let gvViaje = null;
let gvEditando = null;
let focoAntesDeGv = null;
let ultimaCatViaje = "Comida";

function llenarCatsViaje(actual) {
  gvCats.innerHTML = "";
  const nombres = datos.categoriasViaje.slice();
  if (actual && nombres.indexOf(actual) === -1) nombres.push(actual);
  const elegida = nombres.indexOf(actual) !== -1 ? actual : nombres[0];
  nombres.concat(NUEVA_CAT).forEach(function (n) {
    const label = el("label", "chip-cat" + (n === NUEVA_CAT ? " chip-cat-nueva" : ""));
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "gv-cat";
    input.value = n;
    input.checked = n === elegida;
    input.addEventListener("change", mostrarOtraCat);
    label.append(input, el("span", "", n === NUEVA_CAT ? "+ Otro motivo" : n));
    gvCats.appendChild(label);
  });
  gvOtra.value = "";
  marcarError(gvOtra, "");
  mostrarOtraCat();
}

function catGv() {
  const r = gvCats.querySelector('input[name="gv-cat"]:checked');
  return r ? r.value : "";
}

function mostrarOtraCat() {
  const nueva = catGv() === NUEVA_CAT;
  document.getElementById("gv-otra-fila").hidden = !nueva;
  if (!nueva) marcarError(gvOtra, "");
}

function fechaPorDefecto(v) {
  const h = hoy();
  const fin = finViaje(v);
  return h < v.inicio ? v.inicio : h > fin ? fin : h;
}

function llenarDiasGv(v, fecha) {
  gvDia.innerHTML = "";
  let esta = false;
  for (let i = 0; i < v.dias; i++) {
    const f = sumarDias(v.inicio, i);
    const op = document.createElement("option");
    op.value = f;
    op.textContent = "Día " + (i + 1) + " · " + diaSemana(f) + " " + diaMes(f) + (f === hoy() ? " (hoy)" : "");
    gvDia.appendChild(op);
    if (f === fecha) esta = true;
  }
  if (!esta) {
    const op = document.createElement("option");
    op.value = fecha;
    op.textContent = diaMes(fecha) + " (fuera del viaje)";
    gvDia.appendChild(op);
  }
  gvDia.value = fecha;
}

function textoQuedaGv() {
  const v = buscarViaje(gvViaje);
  if (!v) return;
  const c = cuentasViaje(v);
  let queda = c.queda;
  const g = gvEditando ? v.gastos.find(function (x) { return x.id === gvEditando; }) : null;
  if (g) queda += g.monto;
  const monto = numero(gvMonto);
  const despues = queda - monto;
  const t = document.getElementById("gv-queda");
  t.className = despues < 0 ? "negativo" : "";
  t.textContent = monto
    ? (despues < 0 ? "Te pasarías por " + dinero(-despues) : "Te quedarán " + dinero(despues)) + " de " + v.nombre
    : (queda < 0 ? "Ya te pasaste por " + dinero(-queda) : "Te quedan " + dinero(queda)) + " de " + v.nombre;
}

function abrirGastoViaje(idViaje, idGasto) {
  const v = buscarViaje(idViaje);
  if (!v) return;
  const g = idGasto ? v.gastos.find(function (x) { return x.id === idGasto; }) : null;
  gvViaje = v.id;
  gvEditando = g ? g.id : null;
  document.getElementById("titulo-gv").textContent = g ? "Editar gasto" : "Gasto del viaje";
  document.getElementById("gv-guardar").textContent = g ? "Guardar cambios" : "Guardar gasto";
  document.getElementById("gv-eliminar").hidden = !g;
  document.getElementById("gv-acciones").classList.toggle("una-accion", !g);
  gvMonto.value = g ? g.monto.toLocaleString("es-CO") : "";
  llenarCatsViaje(g ? g.categoria : ultimaCatViaje);
  llenarDiasGv(v, g ? g.fecha : fechaPorDefecto(v));
  gvNota.value = g ? g.nota : "";
  marcarError(gvMonto, "");
  limpiarErrorHoja(formGv);
  textoQuedaGv();

  focoAntesDeGv = document.activeElement;
  hojaGv.hidden = false;
  fondoInerte(true);
  formGv.scrollTop = 0;
  if (g) document.getElementById("titulo-gv").focus();
  else gvMonto.focus();
}

function cerrarGastoViaje(devolverA) {
  if (hojaGv.hidden) return;
  hojaGv.hidden = true;
  fondoInerte(false);
  let destino = devolverA;
  if (!destino && gvEditando) destino = document.querySelector('.fila-gasto-viaje[data-id="' + gvEditando + '"]');
  if (!destino || !document.contains(destino)) destino = focoAntesDeGv;
  if (!destino || !document.contains(destino) || destino.offsetParent === null) {
    destino = !ventanaViaje.hidden ? document.getElementById("btn-gasto-viaje") : document.getElementById("titulo-planear");
  }
  destino.focus({ preventScroll: true });
  gvViaje = null;
  gvEditando = null;
  focoAntesDeGv = null;
}

formGv.addEventListener("submit", function (e) {
  e.preventDefault();
  const v = buscarViaje(gvViaje);
  if (!v) return;
  const monto = leerMonto(gvMonto);
  if (!monto) return;

  let cat = catGv();
  let catNueva = null;
  if (cat === NUEVA_CAT) {
    const nombre = gvOtra.value.trim().slice(0, 30);
    if (!nombre) {
      marcarError(gvOtra, "Escribe en qué lo gastaste.");
      gvOtra.focus();
      return;
    }
    const existe = datos.categoriasViaje.find(function (c) {
      return c.toLowerCase() === nombre.toLowerCase();
    });
    cat = existe || nombre;
    if (!existe) {
      catNueva = nombre;
      datos.categoriasViaje.push(nombre);
    }
  }
  const valores = { fecha: gvDia.value || fechaPorDefecto(v), monto: monto, categoria: cat || "Otro", nota: gvNota.value.trim().slice(0, 80) };

  if (gvEditando) {
    const g = v.gastos.find(function (x) { return x.id === gvEditando; });
    if (!g) return;
    const antes = Object.assign({}, g);
    Object.assign(g, valores);
    if (!guardar()) {
      Object.assign(g, antes);
      if (catNueva) datos.categoriasViaje.pop();
      return;
    }
    ultimaCatViaje = g.categoria;
    refrescarViajes();
    cerrarGastoViaje();
    anunciar("Cambios guardados");
    return;
  }

  const nuevo = Object.assign({ id: Date.now() }, valores);
  v.gastos.push(nuevo);
  if (!guardar()) {
    v.gastos.pop();
    if (catNueva) datos.categoriasViaje.pop();
    return;
  }
  ultimaCatViaje = nuevo.categoria;
  refrescarViajes();
  cerrarGastoViaje();
  const queda = cuentasViaje(v).queda;
  mostrarToast("Gasto anotado", "Deshacer", function () {
    const i = v.gastos.indexOf(nuevo);
    if (i === -1) return;
    v.gastos.splice(i, 1);
    guardar();
    refrescarViajes();
    anunciar("Gasto quitado");
  }, nuevo.categoria + " · −" + dinero(monto) + " · " + (queda < 0 ? "te pasaste por " + dinero(-queda) : "te quedan " + dinero(queda)));
});

document.getElementById("gv-eliminar").addEventListener("click", function () {
  const v = buscarViaje(gvViaje);
  if (!v) return;
  const i = v.gastos.findIndex(function (x) { return x.id === gvEditando; });
  if (i === -1) return;
  const eliminado = v.gastos.splice(i, 1)[0];
  if (!guardar()) {
    v.gastos.splice(i, 0, eliminado);
    return;
  }
  refrescarViajes();
  cerrarGastoViaje(document.getElementById("titulo-gastos-viaje"));
  mostrarToast("Gasto eliminado", "Deshacer", function () {
    v.gastos.push(eliminado);
    guardar();
    refrescarViajes();
  }, eliminado.categoria + " · " + dinero(eliminado.monto));
});

gvMonto.addEventListener("input", function () {
  formatearMonto(gvMonto);
  textoQuedaGv();
});
gvOtra.addEventListener("input", function () {
  marcarError(gvOtra, "");
});
document.getElementById("gv-cancelar").addEventListener("click", function () {
  cerrarGastoViaje();
});
document.getElementById("hoja-gv-fondo").addEventListener("click", function () {
  cerrarGastoViaje();
});

// --- Hoja para llevar más plata o devolver lo que sobró ---
const hojaCaja = document.getElementById("hoja-caja");
const formCaja = document.getElementById("form-caja");
const cajaMonto = document.getElementById("caja-monto");
let cajaModo = "mas";
let focoAntesDeCaja = null;

function dibujarCajaPrevia() {
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  const c = cuentasViaje(v);
  const queda = Math.max(c.queda, 0);
  const monto = numero(cajaMonto);
  const linea = document.getElementById("caja-queda");
  const boton = document.getElementById("caja-guardar");
  linea.className = "mover-queda";
  linea.textContent = "";

  if (cajaModo === "mas") {
    boton.textContent = monto ? "Llevar " + dinero(monto) : "Llevar";
    if (monto) {
      linea.classList.add("sube");
      linea.append("El viaje quedará con ");
      linea.appendChild(el("strong", "", dinero(c.queda + monto)));
    }
    return;
  }

  if (monto > queda) {
    linea.classList.add("negativo");
    linea.textContent = "Solo te quedan " + dinero(queda) + " del viaje.";
    boton.textContent = "Devolver";
    return;
  }
  boton.textContent = monto ? "Devolver " + dinero(monto) + " y terminar" : "Terminar viaje";
  const falta = queda - monto;
  if (falta > 0) {
    linea.textContent = "Los " + dinero(falta) + " que no devuelves se anotan como gastados (Sin anotar).";
  } else if (monto) {
    linea.classList.add("sube");
    linea.append("Tu disponible quedará en ");
    linea.appendChild(el("strong", "", conSigno(disponibleTotal() + monto)));
  }
}

function abrirCaja(modo) {
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  const c = cuentasViaje(v);
  cajaModo = modo;
  const mas = modo === "mas";
  document.getElementById("titulo-caja").textContent = mas ? "Llevar más plata" : "Regresé del viaje";
  document.getElementById("caja-texto").textContent = mas
    ? "Sale de tu plata disponible (" + conSigno(disponibleTotal()) + ")."
    : "Lo que devuelvas vuelve a tu plata disponible y el viaje queda terminado.";
  document.getElementById("caja-saldo-etiqueta").textContent = c.queda < 0 ? "Te pasaste por" : "Te queda del viaje";
  ponerMonto(document.getElementById("caja-saldo"), dinero(Math.abs(c.queda)));
  cajaMonto.value = !mas && c.queda > 0 ? c.queda.toLocaleString("es-CO") : "";
  document.getElementById("caja-guardar").classList.toggle("btn-devolver", !mas);
  marcarError(cajaMonto, "");
  limpiarErrorHoja(formCaja);
  dibujarCajaPrevia();

  focoAntesDeCaja = document.activeElement;
  hojaCaja.hidden = false;
  fondoInerte(true);
  if (mas) cajaMonto.focus();
  else document.getElementById("titulo-caja").focus();
}

function cerrarCaja(devolverA) {
  if (hojaCaja.hidden) return;
  hojaCaja.hidden = true;
  fondoInerte(false);
  let destino = devolverA || focoAntesDeCaja;
  if (!destino || !document.contains(destino) || destino.offsetParent === null) {
    destino = document.getElementById("titulo-caja-viaje");
  }
  if (destino.offsetParent === null) destino = document.getElementById("titulo-ventana-viaje");
  destino.focus({ preventScroll: true });
  focoAntesDeCaja = null;
}

formCaja.addEventListener("submit", function (e) {
  e.preventDefault();
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  const c = cuentasViaje(v);

  if (cajaModo === "mas") {
    const monto = leerMonto(cajaMonto);
    if (!monto) return;
    const mov = { id: Date.now(), fecha: hoy(), monto: monto, nota: "Llevé más" };
    v.caja.push(mov);
    if (!guardar()) {
      v.caja.pop();
      return;
    }
    refrescarViajes();
    cerrarCaja();
    mostrarToast("Plata añadida al viaje", "Deshacer", function () {
      const i = v.caja.indexOf(mov);
      if (i === -1) return;
      v.caja.splice(i, 1);
      guardar();
      refrescarViajes();
    }, v.nombre + " · −" + dinero(monto) + " de tu disponible");
    return;
  }

  const queda = Math.max(c.queda, 0);
  const monto = numero(cajaMonto);
  if (monto > queda) {
    marcarError(cajaMonto, "No puedes devolver más de lo que te queda: " + dinero(queda) + ".");
    cajaMonto.focus();
    return;
  }
  const antes = { caja: v.caja.slice(), gastos: v.gastos.slice(), terminado: v.terminado };
  if (monto) v.caja.push({ id: Date.now(), fecha: hoy(), monto: -monto, nota: "Devolví al regresar" });
  const falta = queda - monto;
  // Lo que no vuelve se gastó: se anota para que las cuentas del viaje cierren en cero
  if (falta > 0) {
    v.gastos.push({ id: Date.now() + 1, fecha: fechaPorDefecto(v), monto: falta, categoria: "Sin anotar", nota: "Lo que no devolviste" });
  }
  v.terminado = hoy();
  if (!guardar()) {
    Object.assign(v, antes);
    return;
  }
  refrescarViajes();
  cerrarCaja(document.getElementById("titulo-ventana-viaje"));
  mostrarToast("Viaje terminado", "Deshacer", function () {
    Object.assign(v, antes);
    guardar();
    refrescarViajes();
    anunciar("El viaje sigue en curso");
  }, monto ? dinero(monto) + " volvieron a tu disponible" : "Gastaste todo lo que llevaste");
});

cajaMonto.addEventListener("input", function () {
  formatearMonto(cajaMonto);
  dibujarCajaPrevia();
});
document.getElementById("caja-cancelar").addEventListener("click", function () {
  cerrarCaja();
});
document.getElementById("hoja-caja-fondo").addEventListener("click", function () {
  cerrarCaja();
});

// --- Hoja para editar el viaje ---
const hojaEv = document.getElementById("hoja-ev");
const formEv = document.getElementById("form-ev");
const evNombre = document.getElementById("ev-nombre");
const evDias = document.getElementById("ev-dias");
const evInicio = document.getElementById("ev-inicio");
const evPorDia = document.getElementById("ev-por-dia");
let focoAntesDeEv = null;

function abrirEditarViaje() {
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  evNombre.value = v.nombre;
  evDias.value = String(v.dias);
  evInicio.value = v.inicio;
  evPorDia.value = v.porDia ? v.porDia.toLocaleString("es-CO") : "";
  marcarError(evDias, "");
  marcarError(evPorDia, "");
  limpiarErrorHoja(formEv);
  focoAntesDeEv = document.activeElement;
  hojaEv.hidden = false;
  fondoInerte(true);
  document.getElementById("titulo-ev").focus();
}

function cerrarEditarViaje() {
  if (hojaEv.hidden) return;
  hojaEv.hidden = true;
  fondoInerte(false);
  const destino = focoAntesDeEv && document.contains(focoAntesDeEv) ? focoAntesDeEv : document.getElementById("titulo-ventana-viaje");
  destino.focus({ preventScroll: true });
  focoAntesDeEv = null;
}

formEv.addEventListener("submit", function (e) {
  e.preventDefault();
  const v = buscarViaje(viajeAbierto);
  if (!v) return;
  const dias = parseInt(evDias.value.replace(/\D/g, ""), 10);
  if (!(dias >= 1 && dias <= MAX_DIAS_VIAJE)) {
    marcarError(evDias, "Elige de 1 a " + MAX_DIAS_VIAJE + " días.");
    evDias.focus();
    return;
  }
  const antes = { nombre: v.nombre, dias: v.dias, inicio: v.inicio, porDia: v.porDia };
  v.nombre = evNombre.value.trim().slice(0, 40) || "Mi viaje";
  v.dias = dias;
  v.inicio = evInicio.value || v.inicio;
  v.porDia = numero(evPorDia);
  if (!guardar()) {
    Object.assign(v, antes);
    return;
  }
  refrescarViajes();
  cerrarEditarViaje();
  anunciar("Cambios guardados");
});

document.getElementById("btn-viaje-editar").addEventListener("click", abrirEditarViaje);
evDias.addEventListener("input", function () {
  evDias.value = evDias.value.replace(/\D/g, "").slice(0, 2);
  marcarError(evDias, "");
});
evPorDia.addEventListener("input", function () {
  formatearMonto(evPorDia);
});
document.getElementById("ev-cancelar").addEventListener("click", function () {
  cerrarEditarViaje();
});
document.getElementById("hoja-ev-fondo").addEventListener("click", function () {
  cerrarEditarViaje();
});

// ---------- Respaldo ----------
// El primer respaldo se pide cuando ya hay algo que perder: unos 10 movimientos
// o una semana usando la app. Después, si pasa un mes sin respaldo.
const RESPALDO_MOVIMIENTOS = 10;
const RESPALDO_DIAS_PRIMERO = 7;
const RESPALDO_DIAS_REPETIR = 30;

function diasDesde(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function actualizarAviso() {
  const n = datos.movimientos.length;
  let mostrarAviso = false;
  let titulo = "";

  if (n > 0 && !datos.ultimoRespaldo) {
    // Si los datos vienen de antes de guardar "inicio", vale el movimiento más antiguo
    const inicio = datos.inicio
      ? Date.parse(datos.inicio)
      : Math.min.apply(null, datos.movimientos.map(function (m) { return Number(m.id); }));
    const dias = isFinite(inicio) ? (Date.now() - inicio) / 86400000 : 0;
    mostrarAviso = n >= RESPALDO_MOVIMIENTOS || dias >= RESPALDO_DIAS_PRIMERO;
    titulo = "Tus " + n + (n === 1 ? " movimiento está" : " movimientos están") + " solo en este teléfono";
  } else if (n > 0) {
    const dias = Math.floor(diasDesde(datos.ultimoRespaldo));
    mostrarAviso = dias > RESPALDO_DIAS_REPETIR;
    titulo = "Tu último respaldo es de hace " + dias + " días";
  }

  document.getElementById("aviso-respaldo-titulo").textContent = titulo;
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

    // Sin pregunta previa: se restaura y el aviso ofrece Deshacer.
    // Además queda una copia de lo anterior por si el aviso ya se cerró.
    const anteriores = datos;
    try {
      localStorage.setItem(CLAVE + "-antes-de-importar", JSON.stringify(anteriores));
    } catch (e) {
      // Sin espacio: se continúa igual
    }

    datos = nuevos;
    if (!guardar()) {
      datos = anteriores;
      return;
    }
    refrescarTodo();
    actualizarInfoRespaldo();

    const n = nuevos.movimientos.length;
    const antes = anteriores.movimientos.length;
    mostrarToast(
      "Respaldo restaurado",
      "Deshacer",
      function () {
        datos = anteriores;
        guardar();
        refrescarTodo();
        actualizarInfoRespaldo();
        anunciar("Se recuperaron tus " + antes + " movimientos anteriores");
      },
      n + (n === 1 ? " movimiento" : " movimientos") +
        (antes === 0 ? "" : " · reemplazó " + (antes === 1 ? "1 anterior" : "tus " + antes + " anteriores"))
    );
  } catch (e) {
    mostrarToast(
      "Ese archivo no es un respaldo",
      "",
      null,
      "Elige el archivo .json que exportaste desde Ajustes."
    );
  } finally {
    archivoImportar.value = "";
  }
});

// ---------- Pestañas ----------
const VISTAS = ["registro", "graficos", "ahorro", "viajes", "ajustes"];

function cambiarVista(nombre) {
  VISTAS.forEach(function (v) {
    document.getElementById("vista-" + v).hidden = v !== nombre;
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    const activa = t.dataset.vista === nombre;
    t.classList.toggle("activa", activa);
    if (activa) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });
  btnNuevo.hidden = nombre !== "registro";

  if (nombre === "graficos") mostrarGraficos();
  if (nombre === "ahorro") dibujarAhorro();
  if (nombre === "viajes") dibujarViajes();
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

// ---------- Monto ----------
editMonto.addEventListener("input", function () {
  formatearMonto(editMonto);
});

// ---------- Filtros de gráficos ----------
inputMes.addEventListener("change", mostrarGraficos);
filtroCategoria.addEventListener("change", mostrarGraficos);
todoHistorial.addEventListener("change", mostrarGraficos);

// ---------- Inicio ----------
inputMes.value = hoy().slice(0, 7);
dibujarCategorias();
actualizarInfoRespaldo();
viajeInicio.value = hoy();
mostrar();
dibujarAhorro();
dibujarViajes();
