import { bootstrapCameraKit, createMediaStreamSource } from '@snap/camera-kit';

const lensId = 'eff186dc-91f2-451a-a59b-4178074372cb';
const cameraKitConfig = { apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzk0Njc2MzE3LCJzdWIiOiJlMGY1ZTI0OS1iNTJhLTQyZmYtYWVmNy03YjE1MDcxY2I0Zjh-U1RBR0lOR35iOTUzNjUyNy0yYzQwLTQwMTUtOTQ5YS00MTVmMmI1NDU1ZmUifQ.8rbLADWnod5gA9Gs3HlNpTDZBou3WZLqPGnwXVVXHI4', lensGroupId: '79c8ec9f-6166-4abd-861f-651aa8d9fc43' };
// Nitidez del Lens. Si no se le indica otra cosa, Camera Kit dibuja el Lens al tamaño del video de la cámara, y sin
// una resolución pedida el teléfono entrega video chico (unos 640 x 480). La página lo estiraba a pantalla completa
// (casi 3 veces en un iPhone), por eso el modelo se veía pixelado, sobre todo de lejos.
// Ahora se pide video 720p y el Lens se dibuja a la resolución real de la pantalla, con un tope para que siga fluido.
const CAMERA_SIZE = { width: { ideal: 1280 }, height: { ideal: 720 } };
const MAX_PIXEL_RATIO = 2;          // píxeles por punto de pantalla: 2 = nítido. Si el Lens va lento, probar 1.5
const MAX_RENDER_PIXELS = 1600000;  // tope de 1,6 megapíxeles por cuadro, para tablets y pantallas grandes
const form = document.querySelector('#config');
const status = document.querySelector('#status');
const log = document.querySelector('#log');
const canvas = document.querySelector('#camera');
let stream;
let source;
let resizeTimer;
let lastSize = '';
const stop = document.querySelector('#stop');
stop.addEventListener('click', () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  source = null;
  document.body.classList.remove('active');
  report('Tocá Iniciar prueba para comenzar.');
});
function report(message, error) {
  status.textContent = message;
  let detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}${error.stack ? `\n${error.stack}` : ''}` : '';
  log.textContent += `${new Date().toISOString()} ${message}${detail ? `\n${detail}` : ''}\n`;
}
function note(message) {
  log.textContent += `${new Date().toISOString()} ${message}\n`;
}
function renderSize() {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  const width = (canvas.clientWidth || window.innerWidth) * ratio;
  const height = (canvas.clientHeight || window.innerHeight) * ratio;
  const fit = Math.min(1, Math.sqrt(MAX_RENDER_PIXELS / (width * height)));
  return [Math.round(width * fit), Math.round(height * fit)];
}
async function updateRenderSize() {
  if (!source) return;
  const [width, height] = renderSize();
  const size = `${width} x ${height}`;
  if (size === lastSize) return;
  try {
    await source.setRenderSize(width, height);
    lastSize = size;
    note(`Resolución del Lens: ${size}`);
  } catch (error) {
    note(`No se pudo cambiar la resolución del Lens: ${error.message || error}`);
  }
}
// Al girar el teléfono o cambiar el tamaño de la ventana, se vuelve a ajustar la resolución.
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateRenderSize, 250);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!cameraKitConfig.apiToken || !cameraKitConfig.lensGroupId) {
    report('La prueba todavía no está disponible: falta conectar el Lens en Snap.');
    return;
  }
  form.querySelector('button').disabled = true;
  document.body.classList.add('active');
  if (stream) stream.getTracks().forEach(track => track.stop());
  try {
    report('Iniciando Camera Kit…');
    const cameraKit = await bootstrapCameraKit({ apiToken: cameraKitConfig.apiToken });
    const session = await cameraKit.createSession({ liveRenderTarget: document.querySelector('#camera') });
    session.events.addEventListener('error', ({detail}) => report('Error durante la ejecución del Lens.', detail.error));
    report('Solicitando la cámara…');
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment', ...CAMERA_SIZE},audio:false});
    source = createMediaStreamSource(stream, {cameraType:'environment'});
    lastSize = '';
    await session.setSource(source);
    report('Cargando el Lens…');
    const lens = await cameraKit.lensRepository.loadLens(lensId, cameraKitConfig.lensGroupId);
    await session.applyLens(lens);
    await session.play();
    // Con el teléfono vertical, los datos de la cámara se estabilizan un instante después de abrirla.
    await new Promise(resolve => setTimeout(resolve, 150));
    const track = stream.getVideoTracks()[0];
    const settings = track && track.getSettings ? track.getSettings() : {};
    note(`Cámara: ${settings.width} x ${settings.height}`);
    await updateRenderSize();
    report('Lens iniciado. Apuntá a la imagen de la revista.');
  } catch (error) {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    source = null;
    document.body.classList.remove('active');
    report('No se pudo iniciar la prueba. Abrí los detalles técnicos.', error);
  }
  finally { form.querySelector('button').disabled = false; }
});
document.querySelector('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(log.textContent); status.textContent = 'Diagnóstico copiado.'; } catch { status.textContent = 'No se pudo copiar; seleccioná el texto del diagnóstico.'; } });

