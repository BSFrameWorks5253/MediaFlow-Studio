/**
 * ====================================================================
 * ANYSHARE UPLOAD NOTIFICATION & SYNC SERVICE FOR MEDIAFLOW STUDIO
 * ====================================================================
 * Automatically notifies the AnyShare website, One Tap desktop, and
 * active team admins whenever a Safar upload structure or export finishes.
 * ====================================================================
 */

const SUPABASE_URL = 'https://dubscvthmkgkeiqdladp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kYApNvq2_6HAfNwJb8hW1g_7iLMSVyk';

export interface SafarUploadNotificationPayload {
  safarName: string;
  dateFolder?: string;
  safarRoot?: string;
  mainDataPath?: string;
  uploadedBy?: string;
  totalClips?: number;
  sizeGb?: number;
}

/**
 * Dispatches an upload completion event to AnyShare website & Supabase Realtime.
 */
export async function notifyAnyShareUploadComplete(payload: SafarUploadNotificationPayload): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date().toISOString();
  const uploader = payload.uploadedBy || 'mediaflow_studio';
  const title = `Safar Upload Complete: ${payload.safarName}`;
  const message = payload.dateFolder 
    ? `${payload.safarName} (${payload.dateFolder}) uploaded and verified to vault: ${payload.mainDataPath || payload.safarRoot || 'Central Archive'}.`
    : `${payload.safarName} structure generated and ready for master delivery.`;

  console.log('[MediaFlow -> AnyShare Sync] Dispatching upload completion event:', payload);

  // 1. Direct LAN dispatch to One Tap Desktop Bridge (Port 5253) if active
  try {
    fetch('http://127.0.0.1:5253/api/upload-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp,
        source: 'mediaflow_studio'
      })
    }).catch(() => {});
  } catch (e) {}

  // 2. Direct Supabase Cloud REST Notification Insertion (Exclusively Supabase)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anyshare_notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: 'notif_mf_' + Date.now(),
        recipient_user_id: 'all',
        kind: 'upload_complete',
        title,
        message,
        delivery_state: 'supabase_live',
        read_at: null,
        created_at: timestamp
      })
    });

    return { success: res.ok };
  } catch (err: any) {
    console.warn('[MediaFlow -> AnyShare Sync] Cloud sync warning:', err);
    return { success: true };
  }
}
