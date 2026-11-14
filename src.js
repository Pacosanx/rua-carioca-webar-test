import { bootstrapCameraKit, createMediaStreamSource } from '@snap/camera-kit';

const lensId = '9053243b-4bee-4457-82e2-5f7e9563fddf';
// Snap connection remains incomplete until the Lens is available in a Lens Group.
const cameraKitConfig = { apiToken: '', lensGroupId: '' };
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
  if (document.querySelector('#password').value !== 'PRUEBAAR01') {
    report('La clave de prueba no es correcta.');
    return;
  }
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

