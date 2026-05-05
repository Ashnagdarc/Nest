import { expect, test } from '@playwright/test';

type RealtimePayload =
  | { eventType: 'DELETE'; old: { user_id: string }; new: null }
  | {
      eventType: 'INSERT' | 'UPDATE';
      old: null | { user_id: string };
      new: {
        user_id: string;
        lat: number;
        lng: number;
        accuracy_m: number | null;
        is_sharing: boolean;
        updated_at: string;
      };
    };

const SIM_HTML = `
<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <div id="status">ready</div>
    <script>
      (function () {
        const STALE_MS = 60000;
        const userId = '__USER_ID__';
        const state = { markers: {} };
        function isFresh(updatedAt) {
          return Date.now() - new Date(updatedAt).getTime() <= STALE_MS;
        }
        function toMarker(row) {
          return {
            userId: row.user_id,
            lat: row.lat,
            lng: row.lng,
            accuracyM: row.accuracy_m,
            updatedAt: row.updated_at
          };
        }
        function mergePayload(payload) {
          if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.user_id) {
              delete state.markers[payload.old.user_id];
            }
            return;
          }
          const row = payload.new;
          if (!row || !row.user_id) return;
          if (!row.is_sharing || !isFresh(row.updated_at)) {
            delete state.markers[row.user_id];
            return;
          }
          state.markers[row.user_id] = toMarker(row);
        }
        function emit(eventType, lat, lng) {
          const payload =
            eventType === 'DELETE'
              ? { eventType: 'DELETE', old: { user_id: userId }, new: null }
              : {
                  eventType,
                  old: null,
                  new: {
                    user_id: userId,
                    lat,
                    lng,
                    accuracy_m: 8,
                    is_sharing: true,
                    updated_at: new Date().toISOString()
                  }
                };
          window.__bridgeEmit(payload);
        }
        window.__client = {
          userId,
          start(lat, lng) { emit('INSERT', lat, lng); },
          move(lat, lng) { emit('UPDATE', lat, lng); },
          stop() { emit('DELETE'); },
          onRealtime(payload) { mergePayload(payload); },
          getMarker(userId) { return state.markers[userId] || null; },
          getActiveCount() { return Object.keys(state.markers).length; }
        };
      })();
    </script>
  </body>
</html>
`;

test('multi-tab simulation: A starts/moves/stops, B sees appear/update/vanish', async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  const dispatch = async (payload: RealtimePayload) => {
    await Promise.all([
      pageA.evaluate((p) => {
        // @ts-expect-error browser runtime
        window.__client.onRealtime(p);
      }, payload),
      pageB.evaluate((p) => {
        // @ts-expect-error browser runtime
        window.__client.onRealtime(p);
      }, payload),
    ]);
  };

  await Promise.all([
    pageA.exposeBinding('__bridgeEmit', async (_source, payload: RealtimePayload) => {
      await dispatch(payload);
    }),
    pageB.exposeBinding('__bridgeEmit', async (_source, payload: RealtimePayload) => {
      await dispatch(payload);
    }),
  ]);

  await pageA.setContent(SIM_HTML.replace('__USER_ID__', 'user-a'));
  await pageB.setContent(SIM_HTML.replace('__USER_ID__', 'user-b'));

  // A starts sharing -> B sees marker appear.
  await pageA.evaluate(() => {
    // @ts-expect-error browser runtime
    window.__client.start(6.5244, 3.3792);
  });
  await expect
    .poll(async () =>
      pageB.evaluate(() => {
        // @ts-expect-error browser runtime
        return window.__client.getMarker('user-a');
      })
    )
    .toMatchObject({ lat: 6.5244, lng: 3.3792 });

  // A moves -> B sees updated coordinates.
  await pageA.evaluate(() => {
    // @ts-expect-error browser runtime
    window.__client.move(6.525, 3.381);
  });
  await expect
    .poll(async () =>
      pageB.evaluate(() => {
        // @ts-expect-error browser runtime
        return window.__client.getMarker('user-a');
      })
    )
    .toMatchObject({ lat: 6.525, lng: 3.381 });

  // A stops -> B no longer sees marker.
  await pageA.evaluate(() => {
    // @ts-expect-error browser runtime
    window.__client.stop();
  });
  await expect
    .poll(async () =>
      pageB.evaluate(() => {
        // @ts-expect-error browser runtime
        return window.__client.getMarker('user-a');
      })
    )
    .toBeNull();

  await context.close();
});

