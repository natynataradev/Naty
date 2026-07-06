import { sendCampaign } from './mass-messaging.js';
import { getPendingScheduledCampaigns, updateCampaignStatus } from './campaign-repository.js';

const POLL_INTERVAL_MS = 60_000; // cada 60 segundos

export function startScheduler(): void {
  console.log('[scheduler] iniciado — revisando campañas programadas cada 60s');

  // Primera ejecución inmediata para despachar campañas vencidas al arrancar
  void checkAndDispatch();

  setInterval(() => {
    void checkAndDispatch();
  }, POLL_INTERVAL_MS);
}

async function checkAndDispatch(): Promise<void> {
  try {
    const due = await getPendingScheduledCampaigns();
    if (due.length === 0) return;

    console.log(`[scheduler] ${due.length} campaña(s) pendiente(s) detectada(s)`);

    for (const campaign of due) {
      console.log(`[scheduler] despachando campaña "${campaign.name}" (${campaign.id})`);
      sendCampaign(campaign.id).catch((err: unknown) => {
        console.error(`[scheduler] error al despachar campaña ${campaign.id}:`, err);
        updateCampaignStatus(campaign.id, 'failed').catch(() => null);
      });
    }
  } catch (err) {
    console.error('[scheduler] error al revisar campañas pendientes:', err);
  }
}
