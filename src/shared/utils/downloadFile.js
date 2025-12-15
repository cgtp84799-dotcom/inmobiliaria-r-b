export async function downloadFile(url, filename = "archivo") {
  // El atributo download suele fallar en cross-origin (como URLs de Storage),
  // así que descargamos por fetch -> blob. [web:69]
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}