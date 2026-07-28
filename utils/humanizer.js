
export default {
  // Estimate how long "typing" a reply should take, based on its length.
  getTypingDuration(text) {
    
    
    if (typeof text !== 'string') text = (text && typeof text.body === 'string') ? text.body : '';
    if (!text) return 300;
    const words = text.split(/\s+/).length;
    
    return Math.min(300 + words * 10, 900);
  },

  // Estimate a "thinking" delay before replying, based on the incoming message length.
  getThinkingDelay(incomingLength) {
    const len = incomingLength || 0;
    if (len < 5) return 100;      
    if (len < 50) return 200;     
    return 400;                   
  },

  // Pick a random element from an array.
  randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
};