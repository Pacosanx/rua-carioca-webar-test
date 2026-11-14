import { bootstrapCameraKit, createMediaStreamSource } from '@snap/camera-kit';

const lensId = '9053243b-4bee-4457-82e2-5f7e9563fddf';
const cameraKitConfig = { apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzk0Njc2MzE3LCJzdWIiOiJlMGY1ZTI0OS1iNTJhLTQyZmYtYWVmNy03YjE1MDcxY2I0Zjh-U1RBR0lOR35iOTUzNjUyNy0yYzQwLTQwMTUtOTQ5YS00MTVmMmI1NDU1ZmUifQ.8rbLADWnod5gA9Gs3HlNpTDZBou3WZLqPGnwXVVXHI4', lensGroupId: '79c8ec9f-6166-4abd-861f-651aa8d9fc43' };
const form = document.querySelector('#config');
const status = document.querySelector('#status');
const log = document.querySelector('#log');
let stream;
function report(message, error) {
  status.textContent = message;
  let detail = error ? `${error.name || 'Error'}: ${error.message || String(error)}${error.stack ? `\n${error.stack}` : ''}` : '';
  log.textContent += `${new Date().toISOString()} ${message}${detail ? `\n${detail}` : ''}\n`;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!cameraKitConfig.apiToken || !cameraKitConfig.lensGroupId) {
    report('La prueba todavía no está disponible: falta conectar el Lens en Snap.');
    return;
  }
  form.querySelector('button').disabled = true;
  if (stream) stream.getTracks().forEach(track => track.stop());
  try {
    report('Iniciando Camera Kit…');
    const cameraKit = await bootstrapCameraKit({ apiToken: cameraKitConfig.apiToken });
    const session = await cameraKit.createSession({ liveRenderTarget: document.querySelector('#camera') });
    session.events.addEventListener('error', ({detail}) => report('Error durante la ejecución del Lens.', detail.error));
    report('Solicitando la cámara…');
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    await session.setSource(createMediaStreamSource(stream, {cameraType:'back'}));
    report('Cargando el Lens…');
    const lens = await cameraKit.lensRepository.loadLens(lensId, cameraKitConfig.lensGroupId);
    await session.applyLens(lens);
    await session.play();
    report('Lens iniciado. Apuntá a la imagen de la revista.');
  } catch (error) { report('No se pudo iniciar la prueba.', error); }
  finally { form.querySelector('button').disabled = false; }
});
document.querySelector('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(log.textContent); status.textContent = 'Diagnóstico copiado.'; } catch { status.textContent = 'No se pudo copiar; seleccioná el texto del diagnóstico.'; } });

