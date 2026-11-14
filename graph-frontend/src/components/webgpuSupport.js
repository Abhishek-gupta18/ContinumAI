let _hasUsableWebGPUCache = null;

export async function hasUsableWebGPU() {
  if (_hasUsableWebGPUCache !== null) return _hasUsableWebGPUCache;
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    _hasUsableWebGPUCache = false;
    return false;
  }
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter({ powerPreference: 'low-power' }),
      new Promise(resolve => setTimeout(() => resolve(null), 2000))
    ]);
    if (!adapter || adapter.isFallbackAdapter) {
      _hasUsableWebGPUCache = false;
      return false;
    }
    _hasUsableWebGPUCache = true;
    return true;
  } catch {
    _hasUsableWebGPUCache = false;
    return false;
  }
}