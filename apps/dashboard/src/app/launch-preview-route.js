export function isLaunchPreviewPath(pathname = globalThis.window?.location?.pathname || '') {
  return /^\/launch-preview\/?$/.test(String(pathname || ''));
}
