// Previous: none
// Current: 3.6.3

// React & Vendor Libs
const { useState, useRef, useEffect, useCallback } = wp.element;

import { mwaiFetch } from '@app/helpers';
import tokenManager from '@app/helpers/tokenManager';

/**
 * Shared REST-nonce state for chat surfaces (chatbot, discussions, and later
 * the Workspace). One source of truth for the nonce value, its ref (for
 * immediate access inside async flows), the tokenManager subscription, the
 * token-update handler passed to mwaiFetch/mwaiHandleRes, and the
 * start_session refresh. Extracted from ChatbotContext/DiscussionsContext,
 * which each had their own copy of this exact logic.
 *
 * options:
 * - initialNonce: nonce provided by the server-rendered system params.
 * - restUrl: base REST url; only needed if refreshRestNonce will be used.
 * - onSessionId: called when start_session returns a (new) session id.
 */
export default function useRestNonce({ initialNonce, restUrl = null, onSessionId = null }) {
  const [ restNonce, setRestNonce ] = useState(initialNonce || tokenManager.getToken());
  const restNonceRef = useRef(initialNonce || tokenManager.getToken());
  const [ busyNonce, setBusyNonce ] = useState(false);

  // Subscribe to global token updates
  useEffect(() => {
    const unsubscribe = tokenManager.subscribe((newToken) => {
      setRestNonce(newToken);
      restNonceRef.current = newToken;
    });
    return unsubscribe;
  }, []);

  // The handler given to mwaiFetch/mwaiHandleRes so a server-refreshed token
  // propagates everywhere (state, ref, and globally via the tokenManager).
  const updateToken = useCallback((newToken) => {
    setRestNonce(newToken);
    restNonceRef.current = newToken;
    tokenManager.setToken(newToken);
  }, []);

  const refreshRestNonce = useCallback(async (force = false) => {
    try {
      if (!force && restNonce) {
        return restNonce;
      }
      setBusyNonce(true);
      const res = await mwaiFetch(`${restUrl}/mwai/v1/start_session`);
      const data = await res.json();
      setRestNonce(data.restNonce);
      restNonceRef.current = data.restNonce;
      tokenManager.setToken(data.restNonce); // Update globally
      // Update sessionId if it was N/A or different
      if (data.sessionId && data.sessionId !== 'N/A' && onSessionId) {
        onSessionId(data.sessionId);
      }

      // Also update if new_token is present (in case of token test mode)
      if (data.new_token) {
        // Log token update with expiration info
        if (data.token_expires_at) {
          const expiresAt = new Date(data.token_expires_at * 1000);
          console.log(`[MWAI] 🔐 New token received - expires at ${expiresAt.toLocaleTimeString()} (in ${data.token_expires_in}s)`);
        }
        setRestNonce(data.new_token);
        restNonceRef.current = data.new_token;
        tokenManager.setToken(data.new_token); // Update globally
        return data.new_token;
      }

      return data.restNonce;
    }
    catch (err) {
      console.error('Error while fetching the restNonce.', err);
    }
    finally {
      setBusyNonce(false);
    }
  }, [restNonce, restUrl, onSessionId]);

  return { restNonce, restNonceRef, busyNonce, updateToken, refreshRestNonce, setRestNonce };
}
