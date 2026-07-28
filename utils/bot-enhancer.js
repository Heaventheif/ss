
import humanizer from './humanizer';

// Wrap global.safeSend so every outgoing message is preceded by a human-like typing delay.
export default function enhanceBot(api) {
  const originalSafeSend = global.safeSend;

  // Replacement safeSend: adds a thinking + typing delay before sending.
  global.safeSend = async function enhancedSend(apiInstance, body, threadID, callback, messageID) {
    
    if (!body) {
      return originalSafeSend(apiInstance, body, threadID, callback, messageID);
    }

    
    
    
    const textBody = typeof body === 'string' ? body : (typeof body?.body === 'string' ? body.body : '');
    const isAttachmentOnly = typeof body === 'object' && !!body?.attachment && !textBody;

    
    
    if (isAttachmentOnly) {
      return originalSafeSend(apiInstance, body, threadID, callback, messageID);
    }

    
    
    
    const thinkingMs = humanizer.getThinkingDelay(20);
    await new Promise(resolve => setTimeout(resolve, thinkingMs));

    
    const typingMs = humanizer.getTypingDuration(textBody);
    try {
      api.sendTypingIndicator(threadID, true, { duration: typingMs });
    } catch (_) {
      
    }
    await new Promise(resolve => setTimeout(resolve, typingMs));

    
    try {
      api.sendTypingIndicator(threadID, false);
    } catch (_) {}

    
    
    
    console.log(`[HUMANIZER] تأخير مُطبَّق: ${thinkingMs + typingMs}ms (تفكير=${thinkingMs}ms, كتابة=${typingMs}ms)`);

    
    
    return originalSafeSend(apiInstance, body, threadID, callback, messageID);
  };

  console.log('[✅ ENHANCER] تم تفعيل محاكاة البشر (كتابة + تفكير)');
};