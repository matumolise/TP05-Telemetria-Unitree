// ==============================
// CONFIGURACIÓN
// ==============================

const API_BASE = 'http://127.0.0.1:8001';

const WS_URL =
  API_BASE.replace('http://', 'ws://') + '/ws';

const HISTORY_SIZE = 300;

const RECONNECT_DELAY = 2000;


// ==============================
// ESTADO DE LA APLICACIÓN
// ==============================

let socket = null;

let latestTelemetry = null;

let samples = [];

let imuChart = null;

let temperatureChart = null;

let firstMotorIds = [];

let currentModel = null;

// ==============================
// REFERENCIAS DEL DOM (Document Object Model)
// ==============================

const robotModel =
  document.getElementById('robotModel');

const motorCount =
  document.getElementById('motorCount');

const connectionStatus =
  document.getElementById('connectionStatus');

const connectionIndicator =
  document.getElementById('connectionIndicator');

const lastUpdate =
  document.getElementById('lastUpdate');

const maxTemperature =
  document.getElementById('maxTemperature');

const summaryBattery =
  document.getElementById('summaryBattery');

const sampleCount =
  document.getElementById('sampleCount');

const motorTableBody =
  document.getElementById('motorTableBody');

const rollElement =
  document.getElementById('roll');

const pitchElement =
  document.getElementById('pitch');

const yawElement =
  document.getElementById('yaw');

const batterySoc =
  document.getElementById('batterySoc');

const batteryCurrent =
  document.getElementById('batteryCurrent');

const batteryTemperature =
  document.getElementById('batteryTemperature');

const batteryBarFill =
  document.getElementById('batteryBarFill');

const batteryCells =
  document.getElementById('batteryCells');

const forceIndicators =
  document.getElementById('forceIndicators');

const forceDescription =
  document.getElementById('forceDescription');

const captureButton =
  document.getElementById('captureButton');

const exportButton =
  document.getElementById('exportButton');

const connectionDetail =
  document.getElementById('connectionDetail');

const temperatureChartNote =
  document.getElementById('temperatureChartNote');


// ==============================
// WEBSOCKET
// ==============================

function connectWebSocket() {

  console.log(`Conectando a ${WS_URL}`);

  socket = new WebSocket(WS_URL);


  socket.addEventListener('open', () => {

    console.log('WebSocket conectado');

    setConnectionState(true);

  });


  socket.addEventListener('message', event => {

    try {

      const data = JSON.parse(event.data);

      latestTelemetry = data;

      updateDashboard(data);

    }
    catch (error) {

      console.error(
        'No se pudo procesar la telemetría:',
        error
      );

    }

  });


  socket.addEventListener('error', error => {

    console.error(
      'Error de WebSocket:',
      error
    );

  });


  socket.addEventListener('close', () => {

    console.warn(
      'WebSocket desconectado. Reintentando...'
    );

    setConnectionState(false);

    setTimeout(
      connectWebSocket,
      RECONNECT_DELAY
    );

  });

}


// ==============================
// ESTADO DE CONEXIÓN
// ==============================

function setConnectionState(connected) {

  if (connected) {

    connectionStatus.textContent =
      'Conectado';

    connectionDetail.textContent =
      'Telemetría en tiempo real';

    connectionIndicator.classList.add(
      'connected'
    );

  }
  else {

    connectionStatus.textContent =
      'Desconectado';

    connectionDetail.textContent =
      'Intentando reconectar...';

    connectionIndicator.classList.remove(
      'connected'
    );

  }

}


// ==============================
// ACTUALIZACIÓN GENERAL
// ==============================

function updateDashboard(data) {

  if (
    currentModel &&
    currentModel !== data.modelo
  ) {

    resetModelSpecificState();

  }

  currentModel = data.modelo;

  updateGeneralInfo(data);

  updateMotors(data.motores);

  updateIMU(data.imu);

  updateBMS(data.bms);

  updateForces(
    data.fuerzas,
    data.modelo
  );

  updateCharts(data);

}

function resetModelSpecificState() {

  firstMotorIds = [];

  temperatureChart.data.labels = [];

  temperatureChart.data.datasets = [];

  temperatureChart.update('none');


  imuChart.data.labels = [];

  imuChart.data.datasets.forEach(
    dataset => {
      dataset.data = [];
    }
  );

  imuChart.update('none');


  console.log(
    'Cambio de robot detectado. Históricos reiniciados.'
  );

}


// ==============================
// INFORMACIÓN GENERAL
// ==============================

function updateGeneralInfo(data) {

  const model =
    data.modelo?.toUpperCase() || '--';

  robotModel.textContent =
    model;

  motorCount.textContent =
    data.motores?.length ?? '--';


  const now =
    new Date();

  lastUpdate.textContent =
    now.toLocaleTimeString();


  if (data.motores?.length) {

    const temperatures =
      data.motores.map(
        motor => motor.temperatura
      );

    const highest =
      Math.max(...temperatures);

    maxTemperature.textContent =
      `${highest.toFixed(1)} °C`;

  }


  if (data.bms) {

    summaryBattery.textContent =
      `${data.bms.soc} %`;

  }

}


// ==============================
// PANEL DE MOTORES
// ==============================

function updateMotors(motors) {

  if (!motors?.length) {

    return;

  }


  motorTableBody.innerHTML = '';


  motors.forEach(motor => {

    const row =
      document.createElement('tr');


    const temperatureClass =
      getTemperatureClass(
        motor.temperatura
      );


    row.innerHTML = `
      <td>
        <span class="motor-name">
          ${formatMotorName(motor.nombre)}
        </span>

        <span class="motor-id">
          ID ${motor.id}
        </span>
      </td>

      <td>
        <span class="temp-badge ${temperatureClass}">
          ${motor.temperatura.toFixed(1)} °C
        </span>
      </td>

      <td>
        ${motor.angulo.toFixed(2)} °
      </td>

      <td>
        ${motor.velocidad.toFixed(3)} rad/s
      </td>

      <td>
        ${motor.torque.toFixed(2)} N·m
      </td>
    `;


    motorTableBody.appendChild(row);

  });

}


function getTemperatureClass(temperature) {

  if (temperature < 40) {

    return 'temp-normal';

  }

  if (temperature <= 60) {

    return 'temp-warning';

  }

  return 'temp-danger';

}


function formatMotorName(name) {

  if (!name) {

    return 'Motor';

  }

  return name.replaceAll('_', ' ');

}


// ==============================
// PANEL IMU
// ==============================

function updateIMU(imu) {

  if (!imu) {

    return;

  }


  rollElement.textContent =
    `${imu.roll.toFixed(2)}°`;

  pitchElement.textContent =
    `${imu.pitch.toFixed(2)}°`;

  yawElement.textContent =
    `${imu.yaw.toFixed(2)}°`;

}


// ==============================
// PANEL BMS
// ==============================

function updateBMS(bms) {

  if (!bms) {

    return;

  }


  batterySoc.textContent =
    `${bms.soc} %`;

  batteryCurrent.textContent =
    `${bms.corriente} mA`;

  batteryTemperature.textContent =
    `${bms.temperatura} °C`;


  batteryBarFill.style.width =
    `${Math.min(
      Math.max(bms.soc, 0),
      100
    )}%`;


  batteryCells.innerHTML = '';


  bms.celdas.forEach(
    (voltage, index) => {

      const cell =
        document.createElement('div');

      cell.className =
        'battery-cell';


      cell.innerHTML = `
        <span>Celda ${index + 1}</span>
        <strong>${voltage.toFixed(3)} V</strong>
      `;


      batteryCells.appendChild(cell);

    }
  );

}


// ==============================
// FUERZAS / CONTACTOS
// ==============================

function updateForces(forces, model) {

  if (!forces) {

    return;

  }


  forceIndicators.innerHTML = '';


  const labels = {

    FR: 'Delantera derecha',
    FL: 'Delantera izquierda',

    RR: 'Trasera derecha',
    RL: 'Trasera izquierda',

    R_foot: 'Pie derecho',
    L_foot: 'Pie izquierdo'

  };


  const entries =
    Object.entries(forces);


  if (!entries.length) {

    forceIndicators.innerHTML =
      '<span class="muted">Sin datos de contacto.</span>';

    return;

  }


  if (
    model?.toLowerCase() === 'g1'
  ) {

    forceDescription.textContent =
      'Contacto de los pies del robot humanoide.';

  }
  else {

    forceDescription.textContent =
      'Contacto de las cuatro patas del robot.';

  }


  entries.forEach(
    ([key, value]) => {

      const item =
        document.createElement('div');

      item.className =
        `force-item ${value ? 'active' : ''}`;


      item.innerHTML = `
        <span class="force-dot"></span>

        <div>
          <strong>
            ${labels[key] || key}
          </strong>

          <span>
            ${value ? 'En contacto' : 'Sin contacto'}
          </span>
        </div>
      `;


      forceIndicators.appendChild(item);

    }
  );

}


// ==============================
// GRÁFICO IMU
// ==============================

function createIMUChart() {

  const context =
    document
      .getElementById('imuChart')
      .getContext('2d');


  imuChart =
    new Chart(context, {

      type: 'line',

      data: {

        labels: [],

        datasets: [

          {
            label: 'Roll',
            data: [],
            borderColor: '#315f85',
            tension: 0.25,
            pointRadius: 0
          },

          {
            label: 'Pitch',
            data: [],
            borderColor: '#299764',
            tension: 0.25,
            pointRadius: 0
          },

          {
            label: 'Yaw',
            data: [],
            borderColor: '#d7a124',
            tension: 0.25,
            pointRadius: 0
          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        interaction: {
          intersect: false,
          mode: 'index'
        },

        plugins: {

          legend: {

            position: 'bottom',

            labels: {
              boxWidth: 10,
              usePointStyle: true
            }

          }

        },

        scales: {

          x: {
            display: false
          },

          y: {

            title: {
              display: true,
              text: 'Grados'
            }

          }

        }

      }

    });

}


// ==============================
// GRÁFICO DE TEMPERATURA
// ==============================

function createTemperatureChart() {

  const context =
    document
      .getElementById('temperatureChart')
      .getContext('2d');


  temperatureChart =
    new Chart(context, {

      type: 'line',

      data: {

        labels: [],

        datasets: []

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        interaction: {
          intersect: false,
          mode: 'index'
        },

        plugins: {

          legend: {

            position: 'bottom',

            labels: {
              boxWidth: 10,
              usePointStyle: true
            }

          }

        },

        scales: {

          x: {
            display: false
          },

          y: {

            title: {
              display: true,
              text: 'Temperatura °C'
            }

          }

        }

      }

    });

}


// ==============================
// ACTUALIZACIÓN DE GRÁFICOS
// ==============================

function updateCharts(data) {

  if (
    !data.imu ||
    !data.motores?.length
  ) {

    return;

  }


  const label =
    data.ts ??
    Date.now();


  // IMU

  imuChart.data.labels.push(label);

  imuChart.data.datasets[0]
    .data.push(data.imu.roll);

  imuChart.data.datasets[1]
    .data.push(data.imu.pitch);

  imuChart.data.datasets[2]
    .data.push(data.imu.yaw);


  trimChartHistory(
    imuChart,
    HISTORY_SIZE
  );


  imuChart.update('none');


  // Temperatura

  updateTemperatureChart(
    data.motores,
    label
  );

}


// ==============================
// TEMPERATURA DE MOTORES
// ==============================

function updateTemperatureChart(
  motors,
  label
) {

  if (!firstMotorIds.length) {

    firstMotorIds =
      motors
        .slice(0, 4)
        .map(motor => motor.id);

    temperatureChartNote.textContent =
      `${firstMotorIds.length} motores monitoreados`;


    const colors = [
      '#315f85',
      '#299764',
      '#d7a124',
      '#8b5fbf'
    ];


    firstMotorIds.forEach(
      (motorId, index) => {

        const motor =
          motors.find(
            item => item.id === motorId
          );


        temperatureChart
          .data
          .datasets
          .push({

            label:
              formatMotorName(
                motor.nombre
              ),

            data: [],

            borderColor:
              colors[index],

            tension: 0.25,

            pointRadius: 0

          });

      }
    );

  }


  temperatureChart
    .data
    .labels
    .push(label);


  firstMotorIds.forEach(
    (motorId, index) => {

      const motor =
        motors.find(
          item => item.id === motorId
        );


      if (motor) {

        temperatureChart
          .data
          .datasets[index]
          .data
          .push(
            motor.temperatura
          );

      }

    }
  );


  trimChartHistory(
    temperatureChart,
    HISTORY_SIZE
  );


  temperatureChart.update('none');

}


// ==============================
// BÚFER CIRCULAR
// ==============================

function trimChartHistory(
  chart,
  maxSize
) {

  while (
    chart.data.labels.length >
    maxSize
  ) {

    chart.data.labels.shift();


    chart
      .data
      .datasets
      .forEach(
        dataset =>
          dataset.data.shift()
      );

  }

}


// ==============================
// CAPTURA DE MUESTRAS
// ==============================

function captureSample() {

  if (!latestTelemetry) {

    return;

  }


  const sample =
    flattenTelemetry(
      latestTelemetry
    );


  samples.push(sample);


  sampleCount.textContent =
    samples.length;


  exportButton.disabled =
    false;


  console.log(
    'Muestra capturada:',
    sample
  );

}


// ==============================
// CONVERTIR TELEMETRÍA A FILA CSV
// ==============================

function flattenTelemetry(data) {

  const sample = {

    timestamp:
      new Date()
        .toISOString(),

    robot:
      data.modelo,

    roll:
      data.imu?.roll,

    pitch:
      data.imu?.pitch,

    yaw:
      data.imu?.yaw,

    ax:
      data.imu?.ax,

    ay:
      data.imu?.ay,

    az:
      data.imu?.az,

    battery_soc:
      data.bms?.soc,

    battery_current:
      data.bms?.corriente,

    battery_temperature:
      data.bms?.temperatura

  };


  data.bms?.celdas
    ?.forEach(
      (value, index) => {

        sample[
          `cell_${index + 1}_voltage`
        ] = value;

      }
    );


  Object.entries(
    data.fuerzas || {}
  )
    .forEach(
      ([key, value]) => {

        sample[
          `contact_${key}`
        ] = value;

      }
    );


  data.motores?.forEach(
    motor => {

      const prefix =
        `motor_${motor.id}`;


      sample[
        `${prefix}_angle`
      ] =
        motor.angulo;


      sample[
        `${prefix}_speed`
      ] =
        motor.velocidad;


      sample[
        `${prefix}_torque`
      ] =
        motor.torque;


      sample[
        `${prefix}_temperature`
      ] =
        motor.temperatura;

    }
  );


  return sample;

}


// ==============================
// EXPORTACIÓN CSV
// ==============================

function exportCSV() {

  if (!samples.length) {

    return;

  }


  const columnSet =
    new Set();


  samples.forEach(
    sample => {

      Object
        .keys(sample)
        .forEach(
          key =>
            columnSet.add(key)
        );

    }
  );


  const columns =
    [...columnSet];


  const rows = [

    columns.join(','),

    ...samples.map(
      sample =>

        columns
          .map(
            column =>
              escapeCSV(
                sample[column]
              )
          )
          .join(',')

    )

  ];


  const csv =
    rows.join('\n');


  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement('a');


  link.href =
    url;


  link.download =
    `telemetria_${Date.now()}.csv`;


  link.click();


  URL.revokeObjectURL(url);

}


// ==============================
// ESCAPE CSV
// ==============================

function escapeCSV(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return '';

  }


  const stringValue =
    String(value);


  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {

    return `"${stringValue.replaceAll(
      '"',
      '""'
    )}"`;

  }


  return stringValue;

}


// ==============================
// EVENTOS
// ==============================

captureButton.addEventListener(
  'click',
  captureSample
);


exportButton.addEventListener(
  'click',
  exportCSV
);


// ==============================
// INICIO
// ==============================

createIMUChart();

createTemperatureChart();

connectWebSocket();

console.log(
  'Dashboard iniciado'
);