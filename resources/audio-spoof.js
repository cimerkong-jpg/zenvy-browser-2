(function() {
  const config = %AUDIO_CONFIG%;
  
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!OriginalAudioContext) return;
  
  function SpoofedAudioContext() {
    const ctx = new OriginalAudioContext();
    
    Object.defineProperty(ctx, 'sampleRate', {
      get: () => config.sampleRate,
      configurable: true
    });
    
    const originalCreateOscillator = ctx.createOscillator.bind(ctx);
    ctx.createOscillator = function() {
      const osc = originalCreateOscillator();
      const originalConnect = osc.connect.bind(osc);
      osc.connect = function(...args) {
        const noise = (Math.random() - 0.5) * 0.0001;
        if (osc.frequency) osc.frequency.value += noise;
        return originalConnect(...args);
      };
      return osc;
    };
    
    return ctx;
  }
  
  window.AudioContext = SpoofedAudioContext;
  if (window.webkitAudioContext) {
    window.webkitAudioContext = SpoofedAudioContext;
  }
})();
